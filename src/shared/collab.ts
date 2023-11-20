import { createContext } from "react"
import type * as PromisingArtist from "@travisspomer/promising-artist"
import type { JsonToken } from "utils/tokens"

export interface PluginMethods {
	notify(message: string): void
	importFiles(files: JsonFile[], dry: boolean): Promise<OperationResult[]>
}
export type PluginProxy = PromisingArtist.CollabProxy<PluginMethods>
export const PluginContext = createContext(undefined as unknown as PluginProxy)

export interface UIMethods {
	// Nothing needed yet
}
export type UIProxy = PromisingArtist.CollabProxy<UIMethods>

export type Token = Readonly<JsonToken>

export interface JsonFile {
	name: string
	text: string
}

export interface OperationResult {
	result: "error" | "info" | "log" | "warning"
	text: string
}
