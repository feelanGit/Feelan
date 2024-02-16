// MIT License
//
// Copyright (c) 2023 Vedant Chainani
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


import * as LitJsSdk from '@lit-protocol/lit-node-client';
import { checkAndSignAuthMessage } from '@lit-protocol/lit-node-client';
import type { UnifiedAccessControlConditions } from '@lit-protocol/types';
import { create } from 'zustand';

import type { AuthSig } from '@lit-protocol/types';

interface State {
	litClient: LitJsSdk.LitNodeClient | null;
	authSig: AuthSig | null;
}

interface Actions {
	setClient: (client: LitJsSdk.LitNodeClient) => void;
	setAuthSig: (sig: AuthSig) => void;
}

export const useLitStore = create<State & Actions>()((set) => ({
	litClient: null,
	authSig: null,
	setAuthSig: (authSig: AuthSig) => set({ authSig }),
	setClient: (client: LitJsSdk.LitNodeClient) => set({ litClient: client }),
}));



interface EncryptFileParams {
	file: File;
	conditions: UnifiedAccessControlConditions;
	readme?: string;
}

interface DecryptFileParams {
	file: File | Blob;
}

const useLit = () => {
	const { setClient, setAuthSig } = useLitStore();

	const connect = async () => {
		try {
			const client = new LitJsSdk.LitNodeClient({
				litNetwork: 'cayenne',
			});
			await client.connect();
			setClient(client);
			return client;
		} catch (error) {
			console.log(error);
			return null;
		}
	};

	const signAuth = async () => {
		try {
			const authSig = await checkAndSignAuthMessage({
				chain: 'ethereum',
			});
			setAuthSig(authSig);
			return authSig;
		} catch (error) {
			console.log(error);
			return null;
		}
	};

	const connectAndSign = async () => {
		try {
			const client = await connect();
			const authSig = await signAuth();
			if (!client) return null;
			if (!authSig) return null;
			return { client, authSig };
		} catch (error) {
			console.log(error);
			return null;
		}
	};

	const encryptFile = async ({
		file,
		conditions,
		readme = 'we need readme',
	}: EncryptFileParams) => {
		const res = await connectAndSign();
		if (!res) return;
		const { client, authSig } = res;
		try {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
			const res = await LitJsSdk.encryptFileAndZipWithMetadata({
				unifiedAccessControlConditions: conditions,
				authSig,
				chain: 'ethereum',
				file,
				litNodeClient: client,
				readme,
			});
			const encryptedFile: File = new File([res as Blob], file.name, {
				type: file.type,
			});
			return { encryptedFile, readme };
		} catch (error) {
			console.log(error);
		}
	};

	const decryptFile = async ({ file }: DecryptFileParams) => {
		const res = await connectAndSign();
		if (!res) return null;
		const { client, authSig } = res;
		try {
			const res = await LitJsSdk.decryptZipFileWithMetadata({
				authSig,
				litNodeClient: client,
				file,
			});
			if (!res) {
				return null;
			}
			console.log(res);
			const { decryptedFile, metadata } = res;
			return { decryptedFile, metadata };
		} catch (error) {
			console.log(error);
			return null;
		}
	};

	return { connect, signAuth, encryptFile, decryptFile, connectAndSign };
};

export default useLit;
