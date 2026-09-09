import type { BachsHttpClient } from "../client.js";
import type { FileParam } from "../types/index.js";
import { prepareFile } from "../utils.js";

export type UploadResponse = {
	upload_id: string;
	provider: string;
	file_name: string;
	mime_type: string;
	file_size_bytes: number;
	url: string | null;
	linked_resource_type: string | null;
	linked_resource_id: string | null;
	created_at: string;
	updated_at: string;
};

export type UploadDeleteResponse = {
	upload_id: string;
	deleted: boolean;
};

export class MediaResource {
	constructor(private client: BachsHttpClient) {}

	/**
	 * Upload a file and receive an upload_id.
	 * @param file The file to upload. This can be a `File`, `Blob`, `Buffer`, or standard `FormData` instance (if you append the file under the key 'file').
	 */
	public async upload(file: FileParam): Promise<UploadResponse> {
		const requestBody = prepareFile(file);
		return this.client.post("/utilities/uploads", requestBody);
	}

	public async get(uploadId: string): Promise<UploadResponse> {
		return this.client.get(`/utilities/uploads/${uploadId}`);
	}

	public async delete(uploadId: string): Promise<UploadDeleteResponse> {
		return this.client.delete(`/utilities/uploads/${uploadId}`);
	}
}
