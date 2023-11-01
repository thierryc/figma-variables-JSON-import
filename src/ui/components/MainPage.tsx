import React, { useState } from "react"
import styled from "styled-components"
import { type JsonFile, type OperationResult, PluginContext } from "shared/collab"
import { Disclosure } from "./Disclosure"
import { FileDropZone } from "./FileDropZone"
import { Import } from "./Icons"
import { Content } from "./PluginLayout"
import FileUpload from "./FileUpload"
import Switch from "./Switch"

export function MainPage() {
	const Plugin = React.useContext(PluginContext)
	const [results, setResults] = React.useState<OperationResult[]>([])
	// By default, dry mode is disabled to preserve the original behavior
	// It can be enabled for safer script testing and validation.
	const [dry, setDry] = useState(false)

	const handleSwitchChange = (newStatus: boolean) => {
		setDry(newStatus)
	}

	return (
		<>
			<Content>
				<HorizontalRight>
					<span
						onClick={() => setDry(!dry)}
						title="Use dry mode to simulate script execution without making actual changes, providing a safe way to verify behavior and identify potential issues."
					>
						Dry Run: Test Execution without Making Changes.
					</span>
					<Switch checked={dry} onChange={handleSwitchChange} />
				</HorizontalRight>
				<FileDropZone accept="application/json" onFileChosen={onFileChosen}>
					<Horizontal>
						<Import />
						<div>Mmmm, files. Yummy.</div>
					</Horizontal>
				</FileDropZone>
				<Horizontal>
					<FileUpload accept="application/json" onFileChosen={onFileChosen}></FileUpload>
				</Horizontal>

				{results.length > 0 && (
					<>
						<h2>Results</h2>
						<ResultsList>
							{results.map((result, i) => {
								if (result.result !== "log") {
									return (
										<Result key={i}>
											<ResultIcon>{result.result === "error" ? "❌" : ""}</ResultIcon>
											<ResultText>{result.text}</ResultText>
										</Result>
									)
								}
								return (
									<Result key={i}>
										<ResultText>
											<pre>
												<code>{result.text}</code>
											</pre>
										</ResultText>
									</Result>
								)
							})}
						</ResultsList>
					</>
				)}
				<h2>Import token JSON files</h2>
				<p>Hello! I am here to help you turn token JSON into Figma variables.</p>
				<p>Drag some files into the box above:</p>
				<ul>
					<li>
						JSON files in the{" "}
						<a href="https://design-tokens.github.io/community-group/format/" target="_blank">
							Design Tokens Community Group format
						</a>
					</li>
					<li>Optionally, one manifest JSON file</li>
				</ul>
				<Disclosure label="More about manifest files">
					<p>The manifest files I support are a thing I just made up. They should look like this:</p>
					<NarrowTabsPre>
						<code>{`{
	"name": "Web tokens",
	"collections": {
		"Global": {
			"modes": {
				"Default": [ "global.json" ]
			}
		},
		"Alias": {
			"modes": {
				"Light": [ "light.json" ],
				"Dark": [ "dark.json" ]
			}
		}
	}
}`}</code>
					</NarrowTabsPre>
				</Disclosure>
				<p>The files never leave your computer.</p>
			</Content>
		</>
	)

	async function onFileChosen(files: FileList) {
		const fileList: JsonFile[] = []
		const newResults: OperationResult[] = []

		setResults([{ result: "info", text: "Thinking..." }])

		try {
			for (const file of files) {
				try {
					const fileContents = await file.text()
					fileList.push({ name: file.name, text: fileContents })
				} catch (ex) {
					newResults.push({ result: "error", text: `Failed to read the contents of ${file.name}.` })
				}
			}

			if (fileList.length) newResults.push(...(await Plugin.importFiles(fileList, dry)))

			setResults(newResults)
		} catch (ex) {
			console.error(ex)
			newResults.push({
				result: "error",
				text: `Failed to import the token files: ${
					(ex && ((typeof ex === "object" && "message" in ex && ex.message) || (typeof ex === "string" && ex))) ||
					"no further details available"
				}`,
			})
			setResults(newResults)
		}
	}
}
export default MainPage

const Horizontal = styled.div`
	display: flex;
	gap: 1em;
	align-items: center;
	justify-content: center;
`

const HorizontalRight = styled.div`
	display: flex;
	gap: 0.5em;
	align-items: center;
	justify-content: flex-end;
	margin-bottom: 1em;
`

const NarrowTabsPre = styled.pre`
	tab-size: 2;
	cursor: text;
	user-select: text;
`

const ResultsList = styled.ul`
	padding: 0;
	user-select: text;
`

const Result = styled.li`
	margin: 0.5em 0;
	display: grid;
	grid-template-columns: 2em 1fr;
`

const ResultIcon = styled.div`
	user-select: none;
`

const ResultText = styled.div``
