import type { FileParam } from "./types";

export function prepareFile(file: FileParam) {
	let requestBody = file;

	// If it's not a FormData instance, automatically wrap it in one
	if (typeof FormData !== "undefined" && !(file instanceof FormData)) {
		const formData = new FormData();
		// If the file is a Buffer, wrap it in a Blob for standard FormData
		if (typeof Buffer !== "undefined" && Buffer.isBuffer(file)) {
			formData.append("file", new Blob([new Uint8Array(file)]));
		} else {
			formData.append("file", file as Blob);
		}
		requestBody = formData;
	}
	return requestBody;
}
