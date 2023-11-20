import type { OperationResult } from "shared/collab"
import { jsonColorToFigmaColor } from "utils/color"
import { type JsonToken, type JsonTokenDocument, type JsonManifest, allTokenNodes } from "utils/tokens"
import type { JsonTokenType, ImportedVariables } from "utils/tokens/types"
import { getAliasTargetName } from "utils/tokens/utils"

/** For a given token name in the DTCG format, return a valid token name in the Figma format. */
function tokenNameToFigmaName(name: string): string {
	return name.replaceAll(".", "/")
}

/** For a given token name in the DTCG format, return a valid token name in the Figma format. */
function figmaNameToTokenName(name: string): string {
	return name.replaceAll("/", ".")
}

/** For a given token $type in the DTCG format, return the corresponding Figma token type, or null if there isn't one. */
function tokenTypeToFigmaType($type: JsonTokenType): VariableResolvedDataType | null {
	switch ($type) {
		case "color":
			return "COLOR"
		case "dimension":
		case "duration":
		case "number":
			return "FLOAT"
		case "boolean":
			return "BOOLEAN"
		case "string":
			return "STRING"
		default:
			return null
	}
}

type StringArraysDiff = {
	added: string[];
	updated: string[];
	removed: string[];
};

function getArraysDiff(oldArray: string[], newArray: string[]): StringArraysDiff {
	const added: string[] = [];
	const updated: string[] = [];
	const removed: string[] = [];

	// Check for added and updated strings
	newArray.forEach((item) => {
		if (!oldArray.includes(item)) {
			added.push(item);
		} else {
			updated.push(item);
		}
	});

	// Check for removed strings
	oldArray.forEach((item) => {
		if (!newArray.includes(item)) {
			console.log('Removing', item);
			removed.push(item);
		}
	});

	return { added, updated, removed };
}

type ExtractedProperties<T> = {
	[K in keyof T]?: T[K];
};

function extractProperties<T extends object>(obj: T, propertyNames: (keyof T)[]): ExtractedProperties<T> {
	const result: ExtractedProperties<T> = {};

	propertyNames.forEach((propertyName) => {
		if (obj.hasOwnProperty(propertyName)) {
			result[propertyName] = obj[propertyName];
		}
	});

	return result;
}

interface QueuedUpdate {
	figmaName: string
	tokenName: string
	token: JsonToken
	collectionName: string
	modeName: string
}



export async function importTokens(files: Record<string, JsonTokenDocument>, manifest?: JsonManifest, dry: boolean = true): Promise<OperationResult[]> {
	if (!figma.variables) {
		return [
			{
				result: "error",
				text: `Update and restart Figma to enable Variables features!`,
			},
		]
	}

	const results: OperationResult[] = []
	const collections: Record<string, VariableCollection | LibraryVariableCollection> = {};
	const localVariables: Record<string, Variable> = {};
	const libVariables: Record<string, LibraryVariable> = {};

	// get local variables collections from figma
	const localCollections = figma.variables.getLocalVariableCollections();
	const variablesArray = figma.variables.getLocalVariables();
	for (const collection of localCollections) {
		if (!collections[collection.name]) {
			collections[collection.name] = collection;
		} else {
			results.push({ result: "warning", text: `The collection named "${collection.name} [${collection.id}]" already exists locally. Please remove or rename duplicated collection entries to avoid conflicts.` });
		}
	}

	for (const variable of variablesArray) {
		const name = figmaNameToTokenName(variable.name)
		if (!localVariables[name]) {
			localVariables[name] = variable;
		} else {
			let collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
			if (!collection) {
				collection = { name: "unknown" } as VariableCollection;
			}
			results.push({ result: "warning", text: `The variable "${variable.name} [${variable.id}]" in the local "${collection.name} [${collection.id}]" collection already exists . Please remove or rename duplicated variable entries to avoid conflicts.` });
		}
	}

	// get remote variables collections from figma
	const remoteCollections = figma.teamLibrary ? await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync() : [];
	// console.log(remoteCollections);
	// Remote / team library variables
	for (const collection of remoteCollections) {
		if (collections[collection.name]) {
			results.push({ result: "warning", text: `The remote collection named "${collection.name}" in the library "${collection.libraryName}" already exists locally or in another library. Please remove or rename duplicate collection entries to avoid conflicts.` })
		}
		collections[collection.name] = collection;
		const remoteVariablesArray = await figma.teamLibrary.getVariablesInLibraryCollectionAsync(collection.key);
		for (const variable of remoteVariablesArray) {
			const name = figmaNameToTokenName(variable.name)
			if (libVariables[name]) {
				results.push({ result: "warning", text: `The variable "${variable.name}" in the "${collection.name}" collection library already exists in an other variables librairy. Please remove or rename duplicated variable entries to avoid conflicts.` });
			} else if (localVariables[name]) {
				// console.log(variable, collection);
				results.push({ result: "warning", text: `The variable "${variable.name}" in the "${collection.name}" collection library already exists in the local variables. Please remove or rename duplicated variable entries to avoid conflicts.` });
			} else {
				libVariables[name] = variable;
			}
		}
	}

	const variables: Record<string, Variable | LibraryVariable> = Object.assign({}, localVariables, libVariables);

	// If a manifest wasn't supplied, invent a basic one before starting.
	if (!manifest) {
		const filenames = Object.keys(files)
		const name = filenames.join(", ")
		manifest = {
			name: name,
			collections: {
				[name]: {
					modes: {
						Default: filenames,
					},
				},
			},
		}
	}

	// create imported varaible object
	const importedVariables: ImportedVariables = {};
	const importedVariablesOnError: ImportedVariables = {};

	for (const collectionName in manifest.collections) {
		const collection = manifest.collections[collectionName]
		if (collection.modes) {
			for (const modeName in collection.modes) {
				const modeFilenames = collection.modes[modeName]
				for (const filename of modeFilenames) {
					const document = files[filename]
					if (document) {
						for (const [name, token] of allTokenNodes(document)) {
							const figmaType = tokenTypeToFigmaType(token.$type);
							if (!figmaType) {
								if (!importedVariablesOnError[name]) {
									importedVariablesOnError[name] = {
										collectionName,
										name,
										errors: [],
										isAlias: false,
										modes: {}
									}
								}
								importedVariablesOnError[name].errors.push({ code: 'type', message: `${token.$type} is type not supported` });
							} else {
								let currentVariables = importedVariables[name];
								if (!currentVariables) {
									currentVariables = {
										collectionName,
										name,
										errors: [],
										isAlias: false,
										modes: {}
									}
								}
								if (currentVariables.modes && currentVariables.modes[modeName]) {
									importedVariablesOnError[name].errors.push({ code: 'duplicated', message: `${collectionName}, ${name}, ${modeName} alredy exist` })
								} else {
									if (currentVariables.modes) {
										currentVariables.modes[modeName] = token;
									}
									const targetName = getAliasTargetName(token.$value)
									if (targetName) {
										currentVariables.isAlias = true;
										currentVariables.targetName = targetName;
									}
									importedVariables[name] = currentVariables;
								}
							}
						}
					} else {
						// send error messages to the messager...
					}
				}
			}
		}
	}


	// console.log('importedVariables: ', importedVariables);

	const diff = getArraysDiff(Object.keys(variables), Object.keys(importedVariables));
	// console.log("Added:", Object.keys(diff.added).length, diff.added);
	// console.log("Updated:", Object.keys(diff.updated).length, diff.updated);
	// console.log("removed:", Object.keys(diff.removed).length, diff.removed);
	// console.log("OnError:", Object.keys(importedVariablesOnError).length, importedVariablesOnError);
	// return remoteVariables;

	const tokensToUpdate = Object.assign({}, extractProperties(importedVariables, [...diff.added, ...diff.updated]);

	if (dry) {
		const localDiff = getArraysDiff(Object.keys(localVariables), Object.keys(importedVariables));
		console.log(diff.added);
		results.push({
			result: "info",
			text: `Figma variables to add: ${diff.added.length}`,
		})

		/* for (const element of localDiff.added) {
			results.push({
				result: "log",
				text: `${element} will be added`,
			})
		} */

		results.push({
			result: "info",
			text: `Figma variables to update: ${diff.updated.length}`,
		})

		/* for (const element of localDiff.updated) {
			results.push({
				result: "log",
				text: `${element} will be updated`,
			})
		} */

		results.push({
			result: "warning",
			text: `Figma variables in the local Librairies not included in this import: ${localDiff.removed.length}`,
		})

		for (const element of localDiff.removed) {
			results.push({
				result: "log",
				text: `${element} is not in this import`,
			})
		}

		// results.push({
		// 	result: "info",
		// 	text: `Total of imported tokens: ${Object.keys(tokensToUpdate).length}`,
		// })

		return results;
	}

	let queuedUpdates: QueuedUpdate[] = [];

	for (const key in importedVariables) {
		const t = tokensToUpdate[key];
		if (t) {
			const tokenName = t.name;
			const collectionName = t.collectionName;
			for (const modeName in t.modes) {
				const token = t.modes[modeName];
				queuedUpdates.push({ figmaName: tokenNameToFigmaName(t.name), tokenName, collectionName, modeName, token });
			}
		}
	}

	// Now keep processing the queue of token updates until we make it through a whole iteration without accomplishing anything.
	let variablesCreated = 0,
		otherUpdatesCount = 0;
	let keepGoing: boolean;

	do {
		keepGoing = false
		const retryNextTime: typeof queuedUpdates = []
		for (const update of queuedUpdates) {
			const figmaType = tokenTypeToFigmaType(update.token.$type)
			if (!figmaType) {
				results.push({
					result: "info",
					text: `Unable to add "${figmaNameToTokenName(update.figmaName)}" mode ${update.modeName} because ${update.token.$type} tokens aren‘t supported.`,
				})
				continue
			}

			// First, if this is an alias, see if the target exists already.
			const targetName = getAliasTargetName(update.token.$value)
			let targetVariable: Variable | LibraryVariable | undefined = undefined
			if (targetName) {
				// const targetFigmaName = tokenNameToFigmaName(targetName)
				targetVariable = variables[targetName]
				if (!targetVariable) {
					// This is an alias to a variable that hasn't been created yet, so we can't process it right now.
					// Save it for next iteration.
					retryNextTime.push(update)
					continue
				}
			}

			// TODO: Check for matching types: a variable can't be a string in one mode and a color in another.

			// Okay, this either isn't an alias, or it's an alias to something that indeed exists, so we can continue.
			// If the variable doesn't exist yet, create it now.
			let collection: VariableCollection | LibraryVariableCollection

			let variable: Variable | LibraryVariable | undefined = variables[figmaNameToTokenName(update.figmaName)]
			let modeId: string | undefined = undefined
			if (!variable) {
				// This variable doesn't exist yet. First, create its collection and mode if necessary.
				collection = collections[update.collectionName]
				if (!collection) {
					collection = figma.variables.createVariableCollection(update.collectionName)
					collections[update.collectionName] = collection
					modeId = collection.modes[0].modeId
					collection.renameMode(modeId, update.modeName)
				} else if (!("id" in collection)) {
					// The variable doesn't exist, but it's in a remote collection that does.
					results.push({
						result: "error",
						text: `Failed to create ${update.figmaName} because it‘s defined in a different library.`,
					})
					continue
				}
				// Then we can create the variable itself.
				variable = figma.variables.createVariable(update.figmaName, collection.id, figmaType);
				variables[update.tokenName] = variable
				variablesCreated++
			} else if (!("id" in variable)) {
				results.push({ result: "error", text: `Failed to update ${update.figmaName} because it‘s defined in a different library.` })
				continue
			} else {
				otherUpdatesCount++
				collection = figma.variables.getVariableCollectionById(variable.variableCollectionId)!
			}
			if (!modeId) {
				const mode = collection.modes.find(obj => obj.name === update.modeName)
				try {
					modeId = mode ? mode.modeId : collection.addMode(update.modeName)
				} catch (ex) {
					results.push({
						result: "error",
						text: `Failed to add a variable mode for ${update.modeName}. You may be at the limit of what your Figma account currently allows. (You already have ${collection.modes.length}.) 💸`,
					})
					break
				}
			}
			if (!("id" in variable)) throw new Error("Why wasn't this case caught by earlier code?")

			// Then, we just need to update its value for this mode.

			if (targetVariable) {
				// This variable is an alias token.
				if (!("id" in targetVariable)) {
					// ...and it's referencing a variable in a different file, so we need to import that target before we can reference it.
					targetVariable = await figma.variables.importVariableByKeyAsync(targetVariable.key)
				}
				variable.setValueForMode(modeId, figma.variables.createVariableAlias(targetVariable as Variable))
			} else {
				const value = update.token.$value
				switch (update.token.$type) {
					case "color": {
						const color = jsonColorToFigmaColor(value)
						if (color) variable.setValueForMode(modeId, color)
						else results.push({ result: "error", text: `Invalid color: ${update.figmaName} = ${JSON.stringify(value)}` })
						break
					}
					case "dimension":
					case "duration":
					case "number": {
						const float = typeof value === "number" ? value : parseFloat(value)
						if (!isNaN(float)) variable.setValueForMode(modeId, float)
						else
							results.push({
								result: "error",
								text: `Invalid ${update.token.$type}: "${figmaNameToTokenName(update.figmaName)}" ${update.figmaName} = ${JSON.stringify(value)}`,
							})
						break
					}
					case "boolean":
						if (typeof value === "boolean") variable.setValueForMode(modeId, value)
						else
							results.push({
								result: "error",
								text: `Invalid ${update.token.$type}: ${update.figmaName} = ${JSON.stringify(value)}`,
							})
						break
					case "string":
						variable.setValueForMode(modeId, value)
						break
					default:
						throw new Error(
							`Failed to update a variable of type ${update.token.$type}. tokenTypeToFigmaType probably needs to be updated.`
						)
				}
			}

			variable.description = update.token.$description || variable.description || ""

			// Important: This syntax is a hack specific to this plugin and is not a part of the standard or Figma plans.
			// Also, the scopes property is not available for strings and booleans.
			if (variable.resolvedType === "COLOR" || variable.resolvedType === "FLOAT") {
				if (update.token.$extensions && update.token.$extensions["com.figma"] && update.token.$extensions["com.figma"].scopes) {
					variable.scopes = update.token.$extensions["com.figma"].scopes
				} else {
					variable.scopes = variable.scopes || ["ALL_SCOPES"]
				}
			}

			if (update.token.$extensions && update.token.$extensions["com.figma"] && update.token.$extensions["com.figma"].codeSyntax) {
				const codeSyntaxObj = update.token.$extensions["com.figma"].codeSyntax;
				if (codeSyntaxObj['WEB']) {
					variable.setVariableCodeSyntax('WEB', codeSyntaxObj['WEB'])
				}
				if (codeSyntaxObj['ANDROID']) {
					variable.setVariableCodeSyntax('ANDROID', codeSyntaxObj['ANDROID'])
				}
				if (codeSyntaxObj['iOS']) {
					variable.setVariableCodeSyntax('iOS', codeSyntaxObj['iOS'])
				}
			}

			// Any time we successfully make any updates, we need to loop again unless we completely finish.
			keepGoing = true
		}
		queuedUpdates = retryNextTime
	} while (keepGoing && queuedUpdates.length)

	// Now, if queuedUpdates isn't empty, it's just a list of unresolved aliases, so report those as errors.
	if (queuedUpdates.length) {
		const isTeamLibraryAvailable = !!figma.teamLibrary
		if (!isTeamLibraryAvailable) {
			results.push({
				result: "error",
				text: "The Figma community version of this plugin cannot create variables that alias variables in other files during this phase of the Figma beta. (You can build this plugin from the source code to get all features.) With that in mind:",
			})
		}
		for (const missing of queuedUpdates) {
			results.push({
				result: "error",
				text: `Unable to add "${figmaNameToTokenName(missing.figmaName)}" mode ${missing.modeName} because it is an alias of ${tokenNameToFigmaName(
					getAliasTargetName(missing.token.$value) || "another token"
				)} but ${isTeamLibraryAvailable ? "that doesn‘t exist" : "it wasn‘t found—it may be in a different file"}.`,
			})
		}
	}

	if ((variablesCreated || otherUpdatesCount) && results.length)
		results.push({
			result: "warning",
			text: `${variablesCreated} variables were created and ${otherUpdatesCount} other updates were made, but ${results.length} had errors. Not great, not terrible.`,
		})
	else if (variablesCreated || otherUpdatesCount)
		results.push({
			result: "info",
			text: `${variablesCreated} variables were created and ${otherUpdatesCount} other updates were made.`,
		})
	else results.push({ result: "error", text: `Failed to create or update any variables due to errors.` })

	return results
}
