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


"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLitStore = void 0;
const LitJsSdk = __importStar(require("@lit-protocol/lit-node-client"));
const lit_node_client_1 = require("@lit-protocol/lit-node-client");
const zustand_1 = require("zustand");
exports.useLitStore = (0, zustand_1.create)()((set) => ({
    litClient: null,
    authSig: null,
    setAuthSig: (authSig) => set({ authSig }),
    setClient: (client) => set({ litClient: client }),
}));
const useLit = () => {
    const { setClient, setAuthSig } = (0, exports.useLitStore)();
    const connect = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const client = new LitJsSdk.LitNodeClient({
                litNetwork: 'cayenne',
            });
            yield client.connect();
            setClient(client);
            return client;
        }
        catch (error) {
            console.log(error);
            return null;
        }
    });
    const signAuth = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const authSig = yield (0, lit_node_client_1.checkAndSignAuthMessage)({
                chain: 'ethereum',
            });
            setAuthSig(authSig);
            return authSig;
        }
        catch (error) {
            console.log(error);
            return null;
        }
    });
    const connectAndSign = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const client = yield connect();
            const authSig = yield signAuth();
            if (!client)
                return null;
            if (!authSig)
                return null;
            return { client, authSig };
        }
        catch (error) {
            console.log(error);
            return null;
        }
    });
    const encryptFile = ({ file, conditions, readme = 'we need readme', }) => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield connectAndSign();
        if (!res)
            return;
        const { client, authSig } = res;
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
            const res = yield LitJsSdk.encryptFileAndZipWithMetadata({
                unifiedAccessControlConditions: conditions,
                authSig,
                chain: 'ethereum',
                file,
                litNodeClient: client,
                readme,
            });
            const encryptedFile = new File([res], file.name, {
                type: file.type,
            });
            return { encryptedFile, readme };
        }
        catch (error) {
            console.log(error);
        }
    });
    const decryptFile = ({ file }) => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield connectAndSign();
        if (!res)
            return null;
        const { client, authSig } = res;
        try {
            const res = yield LitJsSdk.decryptZipFileWithMetadata({
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
        }
        catch (error) {
            console.log(error);
            return null;
        }
    });
    return { connect, signAuth, encryptFile, decryptFile, connectAndSign };
};
exports.default = useLit;
