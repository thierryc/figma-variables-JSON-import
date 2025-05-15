import type { OperationResult } from "shared/collab"
import type { OperationResult } from "shared/collab"
import { jsonColorToFigmaColor } from "utils/color"
import { type JsonToken, type JsonTokenDocument, type JsonManifest, allTokenNodes } from "utils/tokens"
import type { JsonTokenType } from "utils/tokens/types"
import { getAliasTargetName } from "utils/tokens/utils"

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

export async function diffTokens(files: Record<string, JsonTokenDocument>, manifest?: JsonManifest): Promise<OperationResult[]> {
	console.log(files);
	console.log(manifest);

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

	const results: OperationResult[] = []
	return results;
}
