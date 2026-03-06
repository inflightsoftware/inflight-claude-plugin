var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/.pnpm/esbuild@0.20.2/node_modules/esbuild/lib/main.js
var require_main = __commonJS({
  "node_modules/.pnpm/esbuild@0.20.2/node_modules/esbuild/lib/main.js"(exports, module) {
    "use strict";
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var node_exports = {};
    __export(node_exports, {
      analyzeMetafile: () => analyzeMetafile,
      analyzeMetafileSync: () => analyzeMetafileSync,
      build: () => build,
      buildSync: () => buildSync,
      context: () => context,
      default: () => node_default,
      formatMessages: () => formatMessages,
      formatMessagesSync: () => formatMessagesSync,
      initialize: () => initialize,
      stop: () => stop,
      transform: () => transform,
      transformSync: () => transformSync,
      version: () => version
    });
    module.exports = __toCommonJS(node_exports);
    function encodePacket(packet) {
      let visit = (value) => {
        if (value === null) {
          bb.write8(0);
        } else if (typeof value === "boolean") {
          bb.write8(1);
          bb.write8(+value);
        } else if (typeof value === "number") {
          bb.write8(2);
          bb.write32(value | 0);
        } else if (typeof value === "string") {
          bb.write8(3);
          bb.write(encodeUTF8(value));
        } else if (value instanceof Uint8Array) {
          bb.write8(4);
          bb.write(value);
        } else if (value instanceof Array) {
          bb.write8(5);
          bb.write32(value.length);
          for (let item of value) {
            visit(item);
          }
        } else {
          let keys = Object.keys(value);
          bb.write8(6);
          bb.write32(keys.length);
          for (let key of keys) {
            bb.write(encodeUTF8(key));
            visit(value[key]);
          }
        }
      };
      let bb = new ByteBuffer();
      bb.write32(0);
      bb.write32(packet.id << 1 | +!packet.isRequest);
      visit(packet.value);
      writeUInt32LE(bb.buf, bb.len - 4, 0);
      return bb.buf.subarray(0, bb.len);
    }
    function decodePacket(bytes) {
      let visit = () => {
        switch (bb.read8()) {
          case 0:
            return null;
          case 1:
            return !!bb.read8();
          case 2:
            return bb.read32();
          case 3:
            return decodeUTF8(bb.read());
          case 4:
            return bb.read();
          case 5: {
            let count = bb.read32();
            let value2 = [];
            for (let i = 0; i < count; i++) {
              value2.push(visit());
            }
            return value2;
          }
          case 6: {
            let count = bb.read32();
            let value2 = {};
            for (let i = 0; i < count; i++) {
              value2[decodeUTF8(bb.read())] = visit();
            }
            return value2;
          }
          default:
            throw new Error("Invalid packet");
        }
      };
      let bb = new ByteBuffer(bytes);
      let id = bb.read32();
      let isRequest = (id & 1) === 0;
      id >>>= 1;
      let value = visit();
      if (bb.ptr !== bytes.length) {
        throw new Error("Invalid packet");
      }
      return { id, isRequest, value };
    }
    var ByteBuffer = class {
      constructor(buf = new Uint8Array(1024)) {
        this.buf = buf;
        this.len = 0;
        this.ptr = 0;
      }
      _write(delta) {
        if (this.len + delta > this.buf.length) {
          let clone = new Uint8Array((this.len + delta) * 2);
          clone.set(this.buf);
          this.buf = clone;
        }
        this.len += delta;
        return this.len - delta;
      }
      write8(value) {
        let offset = this._write(1);
        this.buf[offset] = value;
      }
      write32(value) {
        let offset = this._write(4);
        writeUInt32LE(this.buf, value, offset);
      }
      write(bytes) {
        let offset = this._write(4 + bytes.length);
        writeUInt32LE(this.buf, bytes.length, offset);
        this.buf.set(bytes, offset + 4);
      }
      _read(delta) {
        if (this.ptr + delta > this.buf.length) {
          throw new Error("Invalid packet");
        }
        this.ptr += delta;
        return this.ptr - delta;
      }
      read8() {
        return this.buf[this._read(1)];
      }
      read32() {
        return readUInt32LE(this.buf, this._read(4));
      }
      read() {
        let length = this.read32();
        let bytes = new Uint8Array(length);
        let ptr = this._read(bytes.length);
        bytes.set(this.buf.subarray(ptr, ptr + length));
        return bytes;
      }
    };
    var encodeUTF8;
    var decodeUTF8;
    var encodeInvariant;
    if (typeof TextEncoder !== "undefined" && typeof TextDecoder !== "undefined") {
      let encoder = new TextEncoder();
      let decoder = new TextDecoder();
      encodeUTF8 = (text) => encoder.encode(text);
      decodeUTF8 = (bytes) => decoder.decode(bytes);
      encodeInvariant = 'new TextEncoder().encode("")';
    } else if (typeof Buffer !== "undefined") {
      encodeUTF8 = (text) => Buffer.from(text);
      decodeUTF8 = (bytes) => {
        let { buffer, byteOffset, byteLength } = bytes;
        return Buffer.from(buffer, byteOffset, byteLength).toString();
      };
      encodeInvariant = 'Buffer.from("")';
    } else {
      throw new Error("No UTF-8 codec found");
    }
    if (!(encodeUTF8("") instanceof Uint8Array))
      throw new Error(`Invariant violation: "${encodeInvariant} instanceof Uint8Array" is incorrectly false

This indicates that your JavaScript environment is broken. You cannot use
esbuild in this environment because esbuild relies on this invariant. This
is not a problem with esbuild. You need to fix your environment instead.
`);
    function readUInt32LE(buffer, offset) {
      return buffer[offset++] | buffer[offset++] << 8 | buffer[offset++] << 16 | buffer[offset++] << 24;
    }
    function writeUInt32LE(buffer, value, offset) {
      buffer[offset++] = value;
      buffer[offset++] = value >> 8;
      buffer[offset++] = value >> 16;
      buffer[offset++] = value >> 24;
    }
    var quote = JSON.stringify;
    var buildLogLevelDefault = "warning";
    var transformLogLevelDefault = "silent";
    function validateTarget(target) {
      validateStringValue(target, "target");
      if (target.indexOf(",") >= 0)
        throw new Error(`Invalid target: ${target}`);
      return target;
    }
    var canBeAnything = () => null;
    var mustBeBoolean = (value) => typeof value === "boolean" ? null : "a boolean";
    var mustBeString = (value) => typeof value === "string" ? null : "a string";
    var mustBeRegExp = (value) => value instanceof RegExp ? null : "a RegExp object";
    var mustBeInteger = (value) => typeof value === "number" && value === (value | 0) ? null : "an integer";
    var mustBeFunction = (value) => typeof value === "function" ? null : "a function";
    var mustBeArray = (value) => Array.isArray(value) ? null : "an array";
    var mustBeObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? null : "an object";
    var mustBeEntryPoints = (value) => typeof value === "object" && value !== null ? null : "an array or an object";
    var mustBeWebAssemblyModule = (value) => value instanceof WebAssembly.Module ? null : "a WebAssembly.Module";
    var mustBeObjectOrNull = (value) => typeof value === "object" && !Array.isArray(value) ? null : "an object or null";
    var mustBeStringOrBoolean = (value) => typeof value === "string" || typeof value === "boolean" ? null : "a string or a boolean";
    var mustBeStringOrObject = (value) => typeof value === "string" || typeof value === "object" && value !== null && !Array.isArray(value) ? null : "a string or an object";
    var mustBeStringOrArray = (value) => typeof value === "string" || Array.isArray(value) ? null : "a string or an array";
    var mustBeStringOrUint8Array = (value) => typeof value === "string" || value instanceof Uint8Array ? null : "a string or a Uint8Array";
    var mustBeStringOrURL = (value) => typeof value === "string" || value instanceof URL ? null : "a string or a URL";
    function getFlag(object, keys, key, mustBeFn) {
      let value = object[key];
      keys[key + ""] = true;
      if (value === void 0)
        return void 0;
      let mustBe = mustBeFn(value);
      if (mustBe !== null)
        throw new Error(`${quote(key)} must be ${mustBe}`);
      return value;
    }
    function checkForInvalidFlags(object, keys, where) {
      for (let key in object) {
        if (!(key in keys)) {
          throw new Error(`Invalid option ${where}: ${quote(key)}`);
        }
      }
    }
    function validateInitializeOptions(options) {
      let keys = /* @__PURE__ */ Object.create(null);
      let wasmURL = getFlag(options, keys, "wasmURL", mustBeStringOrURL);
      let wasmModule = getFlag(options, keys, "wasmModule", mustBeWebAssemblyModule);
      let worker = getFlag(options, keys, "worker", mustBeBoolean);
      checkForInvalidFlags(options, keys, "in initialize() call");
      return {
        wasmURL,
        wasmModule,
        worker
      };
    }
    function validateMangleCache(mangleCache) {
      let validated;
      if (mangleCache !== void 0) {
        validated = /* @__PURE__ */ Object.create(null);
        for (let key in mangleCache) {
          let value = mangleCache[key];
          if (typeof value === "string" || value === false) {
            validated[key] = value;
          } else {
            throw new Error(`Expected ${quote(key)} in mangle cache to map to either a string or false`);
          }
        }
      }
      return validated;
    }
    function pushLogFlags(flags, options, keys, isTTY2, logLevelDefault) {
      let color = getFlag(options, keys, "color", mustBeBoolean);
      let logLevel = getFlag(options, keys, "logLevel", mustBeString);
      let logLimit = getFlag(options, keys, "logLimit", mustBeInteger);
      if (color !== void 0)
        flags.push(`--color=${color}`);
      else if (isTTY2)
        flags.push(`--color=true`);
      flags.push(`--log-level=${logLevel || logLevelDefault}`);
      flags.push(`--log-limit=${logLimit || 0}`);
    }
    function validateStringValue(value, what, key) {
      if (typeof value !== "string") {
        throw new Error(`Expected value for ${what}${key !== void 0 ? " " + quote(key) : ""} to be a string, got ${typeof value} instead`);
      }
      return value;
    }
    function pushCommonFlags(flags, options, keys) {
      let legalComments = getFlag(options, keys, "legalComments", mustBeString);
      let sourceRoot = getFlag(options, keys, "sourceRoot", mustBeString);
      let sourcesContent = getFlag(options, keys, "sourcesContent", mustBeBoolean);
      let target = getFlag(options, keys, "target", mustBeStringOrArray);
      let format = getFlag(options, keys, "format", mustBeString);
      let globalName = getFlag(options, keys, "globalName", mustBeString);
      let mangleProps = getFlag(options, keys, "mangleProps", mustBeRegExp);
      let reserveProps = getFlag(options, keys, "reserveProps", mustBeRegExp);
      let mangleQuoted = getFlag(options, keys, "mangleQuoted", mustBeBoolean);
      let minify = getFlag(options, keys, "minify", mustBeBoolean);
      let minifySyntax = getFlag(options, keys, "minifySyntax", mustBeBoolean);
      let minifyWhitespace = getFlag(options, keys, "minifyWhitespace", mustBeBoolean);
      let minifyIdentifiers = getFlag(options, keys, "minifyIdentifiers", mustBeBoolean);
      let lineLimit = getFlag(options, keys, "lineLimit", mustBeInteger);
      let drop = getFlag(options, keys, "drop", mustBeArray);
      let dropLabels = getFlag(options, keys, "dropLabels", mustBeArray);
      let charset = getFlag(options, keys, "charset", mustBeString);
      let treeShaking = getFlag(options, keys, "treeShaking", mustBeBoolean);
      let ignoreAnnotations = getFlag(options, keys, "ignoreAnnotations", mustBeBoolean);
      let jsx = getFlag(options, keys, "jsx", mustBeString);
      let jsxFactory = getFlag(options, keys, "jsxFactory", mustBeString);
      let jsxFragment = getFlag(options, keys, "jsxFragment", mustBeString);
      let jsxImportSource = getFlag(options, keys, "jsxImportSource", mustBeString);
      let jsxDev = getFlag(options, keys, "jsxDev", mustBeBoolean);
      let jsxSideEffects = getFlag(options, keys, "jsxSideEffects", mustBeBoolean);
      let define = getFlag(options, keys, "define", mustBeObject);
      let logOverride = getFlag(options, keys, "logOverride", mustBeObject);
      let supported = getFlag(options, keys, "supported", mustBeObject);
      let pure = getFlag(options, keys, "pure", mustBeArray);
      let keepNames = getFlag(options, keys, "keepNames", mustBeBoolean);
      let platform = getFlag(options, keys, "platform", mustBeString);
      let tsconfigRaw = getFlag(options, keys, "tsconfigRaw", mustBeStringOrObject);
      if (legalComments)
        flags.push(`--legal-comments=${legalComments}`);
      if (sourceRoot !== void 0)
        flags.push(`--source-root=${sourceRoot}`);
      if (sourcesContent !== void 0)
        flags.push(`--sources-content=${sourcesContent}`);
      if (target) {
        if (Array.isArray(target))
          flags.push(`--target=${Array.from(target).map(validateTarget).join(",")}`);
        else
          flags.push(`--target=${validateTarget(target)}`);
      }
      if (format)
        flags.push(`--format=${format}`);
      if (globalName)
        flags.push(`--global-name=${globalName}`);
      if (platform)
        flags.push(`--platform=${platform}`);
      if (tsconfigRaw)
        flags.push(`--tsconfig-raw=${typeof tsconfigRaw === "string" ? tsconfigRaw : JSON.stringify(tsconfigRaw)}`);
      if (minify)
        flags.push("--minify");
      if (minifySyntax)
        flags.push("--minify-syntax");
      if (minifyWhitespace)
        flags.push("--minify-whitespace");
      if (minifyIdentifiers)
        flags.push("--minify-identifiers");
      if (lineLimit)
        flags.push(`--line-limit=${lineLimit}`);
      if (charset)
        flags.push(`--charset=${charset}`);
      if (treeShaking !== void 0)
        flags.push(`--tree-shaking=${treeShaking}`);
      if (ignoreAnnotations)
        flags.push(`--ignore-annotations`);
      if (drop)
        for (let what of drop)
          flags.push(`--drop:${validateStringValue(what, "drop")}`);
      if (dropLabels)
        flags.push(`--drop-labels=${Array.from(dropLabels).map((what) => validateStringValue(what, "dropLabels")).join(",")}`);
      if (mangleProps)
        flags.push(`--mangle-props=${mangleProps.source}`);
      if (reserveProps)
        flags.push(`--reserve-props=${reserveProps.source}`);
      if (mangleQuoted !== void 0)
        flags.push(`--mangle-quoted=${mangleQuoted}`);
      if (jsx)
        flags.push(`--jsx=${jsx}`);
      if (jsxFactory)
        flags.push(`--jsx-factory=${jsxFactory}`);
      if (jsxFragment)
        flags.push(`--jsx-fragment=${jsxFragment}`);
      if (jsxImportSource)
        flags.push(`--jsx-import-source=${jsxImportSource}`);
      if (jsxDev)
        flags.push(`--jsx-dev`);
      if (jsxSideEffects)
        flags.push(`--jsx-side-effects`);
      if (define) {
        for (let key in define) {
          if (key.indexOf("=") >= 0)
            throw new Error(`Invalid define: ${key}`);
          flags.push(`--define:${key}=${validateStringValue(define[key], "define", key)}`);
        }
      }
      if (logOverride) {
        for (let key in logOverride) {
          if (key.indexOf("=") >= 0)
            throw new Error(`Invalid log override: ${key}`);
          flags.push(`--log-override:${key}=${validateStringValue(logOverride[key], "log override", key)}`);
        }
      }
      if (supported) {
        for (let key in supported) {
          if (key.indexOf("=") >= 0)
            throw new Error(`Invalid supported: ${key}`);
          const value = supported[key];
          if (typeof value !== "boolean")
            throw new Error(`Expected value for supported ${quote(key)} to be a boolean, got ${typeof value} instead`);
          flags.push(`--supported:${key}=${value}`);
        }
      }
      if (pure)
        for (let fn of pure)
          flags.push(`--pure:${validateStringValue(fn, "pure")}`);
      if (keepNames)
        flags.push(`--keep-names`);
    }
    function flagsForBuildOptions(callName, options, isTTY2, logLevelDefault, writeDefault) {
      var _a2;
      let flags = [];
      let entries = [];
      let keys = /* @__PURE__ */ Object.create(null);
      let stdinContents = null;
      let stdinResolveDir = null;
      pushLogFlags(flags, options, keys, isTTY2, logLevelDefault);
      pushCommonFlags(flags, options, keys);
      let sourcemap = getFlag(options, keys, "sourcemap", mustBeStringOrBoolean);
      let bundle = getFlag(options, keys, "bundle", mustBeBoolean);
      let splitting = getFlag(options, keys, "splitting", mustBeBoolean);
      let preserveSymlinks = getFlag(options, keys, "preserveSymlinks", mustBeBoolean);
      let metafile = getFlag(options, keys, "metafile", mustBeBoolean);
      let outfile = getFlag(options, keys, "outfile", mustBeString);
      let outdir = getFlag(options, keys, "outdir", mustBeString);
      let outbase = getFlag(options, keys, "outbase", mustBeString);
      let tsconfig = getFlag(options, keys, "tsconfig", mustBeString);
      let resolveExtensions = getFlag(options, keys, "resolveExtensions", mustBeArray);
      let nodePathsInput = getFlag(options, keys, "nodePaths", mustBeArray);
      let mainFields = getFlag(options, keys, "mainFields", mustBeArray);
      let conditions = getFlag(options, keys, "conditions", mustBeArray);
      let external = getFlag(options, keys, "external", mustBeArray);
      let packages = getFlag(options, keys, "packages", mustBeString);
      let alias = getFlag(options, keys, "alias", mustBeObject);
      let loader = getFlag(options, keys, "loader", mustBeObject);
      let outExtension = getFlag(options, keys, "outExtension", mustBeObject);
      let publicPath = getFlag(options, keys, "publicPath", mustBeString);
      let entryNames = getFlag(options, keys, "entryNames", mustBeString);
      let chunkNames = getFlag(options, keys, "chunkNames", mustBeString);
      let assetNames = getFlag(options, keys, "assetNames", mustBeString);
      let inject = getFlag(options, keys, "inject", mustBeArray);
      let banner = getFlag(options, keys, "banner", mustBeObject);
      let footer = getFlag(options, keys, "footer", mustBeObject);
      let entryPoints = getFlag(options, keys, "entryPoints", mustBeEntryPoints);
      let absWorkingDir = getFlag(options, keys, "absWorkingDir", mustBeString);
      let stdin = getFlag(options, keys, "stdin", mustBeObject);
      let write = (_a2 = getFlag(options, keys, "write", mustBeBoolean)) != null ? _a2 : writeDefault;
      let allowOverwrite = getFlag(options, keys, "allowOverwrite", mustBeBoolean);
      let mangleCache = getFlag(options, keys, "mangleCache", mustBeObject);
      keys.plugins = true;
      checkForInvalidFlags(options, keys, `in ${callName}() call`);
      if (sourcemap)
        flags.push(`--sourcemap${sourcemap === true ? "" : `=${sourcemap}`}`);
      if (bundle)
        flags.push("--bundle");
      if (allowOverwrite)
        flags.push("--allow-overwrite");
      if (splitting)
        flags.push("--splitting");
      if (preserveSymlinks)
        flags.push("--preserve-symlinks");
      if (metafile)
        flags.push(`--metafile`);
      if (outfile)
        flags.push(`--outfile=${outfile}`);
      if (outdir)
        flags.push(`--outdir=${outdir}`);
      if (outbase)
        flags.push(`--outbase=${outbase}`);
      if (tsconfig)
        flags.push(`--tsconfig=${tsconfig}`);
      if (packages)
        flags.push(`--packages=${packages}`);
      if (resolveExtensions) {
        let values = [];
        for (let value of resolveExtensions) {
          validateStringValue(value, "resolve extension");
          if (value.indexOf(",") >= 0)
            throw new Error(`Invalid resolve extension: ${value}`);
          values.push(value);
        }
        flags.push(`--resolve-extensions=${values.join(",")}`);
      }
      if (publicPath)
        flags.push(`--public-path=${publicPath}`);
      if (entryNames)
        flags.push(`--entry-names=${entryNames}`);
      if (chunkNames)
        flags.push(`--chunk-names=${chunkNames}`);
      if (assetNames)
        flags.push(`--asset-names=${assetNames}`);
      if (mainFields) {
        let values = [];
        for (let value of mainFields) {
          validateStringValue(value, "main field");
          if (value.indexOf(",") >= 0)
            throw new Error(`Invalid main field: ${value}`);
          values.push(value);
        }
        flags.push(`--main-fields=${values.join(",")}`);
      }
      if (conditions) {
        let values = [];
        for (let value of conditions) {
          validateStringValue(value, "condition");
          if (value.indexOf(",") >= 0)
            throw new Error(`Invalid condition: ${value}`);
          values.push(value);
        }
        flags.push(`--conditions=${values.join(",")}`);
      }
      if (external)
        for (let name of external)
          flags.push(`--external:${validateStringValue(name, "external")}`);
      if (alias) {
        for (let old in alias) {
          if (old.indexOf("=") >= 0)
            throw new Error(`Invalid package name in alias: ${old}`);
          flags.push(`--alias:${old}=${validateStringValue(alias[old], "alias", old)}`);
        }
      }
      if (banner) {
        for (let type in banner) {
          if (type.indexOf("=") >= 0)
            throw new Error(`Invalid banner file type: ${type}`);
          flags.push(`--banner:${type}=${validateStringValue(banner[type], "banner", type)}`);
        }
      }
      if (footer) {
        for (let type in footer) {
          if (type.indexOf("=") >= 0)
            throw new Error(`Invalid footer file type: ${type}`);
          flags.push(`--footer:${type}=${validateStringValue(footer[type], "footer", type)}`);
        }
      }
      if (inject)
        for (let path32 of inject)
          flags.push(`--inject:${validateStringValue(path32, "inject")}`);
      if (loader) {
        for (let ext in loader) {
          if (ext.indexOf("=") >= 0)
            throw new Error(`Invalid loader extension: ${ext}`);
          flags.push(`--loader:${ext}=${validateStringValue(loader[ext], "loader", ext)}`);
        }
      }
      if (outExtension) {
        for (let ext in outExtension) {
          if (ext.indexOf("=") >= 0)
            throw new Error(`Invalid out extension: ${ext}`);
          flags.push(`--out-extension:${ext}=${validateStringValue(outExtension[ext], "out extension", ext)}`);
        }
      }
      if (entryPoints) {
        if (Array.isArray(entryPoints)) {
          for (let i = 0, n = entryPoints.length; i < n; i++) {
            let entryPoint = entryPoints[i];
            if (typeof entryPoint === "object" && entryPoint !== null) {
              let entryPointKeys = /* @__PURE__ */ Object.create(null);
              let input = getFlag(entryPoint, entryPointKeys, "in", mustBeString);
              let output = getFlag(entryPoint, entryPointKeys, "out", mustBeString);
              checkForInvalidFlags(entryPoint, entryPointKeys, "in entry point at index " + i);
              if (input === void 0)
                throw new Error('Missing property "in" for entry point at index ' + i);
              if (output === void 0)
                throw new Error('Missing property "out" for entry point at index ' + i);
              entries.push([output, input]);
            } else {
              entries.push(["", validateStringValue(entryPoint, "entry point at index " + i)]);
            }
          }
        } else {
          for (let key in entryPoints) {
            entries.push([key, validateStringValue(entryPoints[key], "entry point", key)]);
          }
        }
      }
      if (stdin) {
        let stdinKeys = /* @__PURE__ */ Object.create(null);
        let contents = getFlag(stdin, stdinKeys, "contents", mustBeStringOrUint8Array);
        let resolveDir = getFlag(stdin, stdinKeys, "resolveDir", mustBeString);
        let sourcefile = getFlag(stdin, stdinKeys, "sourcefile", mustBeString);
        let loader2 = getFlag(stdin, stdinKeys, "loader", mustBeString);
        checkForInvalidFlags(stdin, stdinKeys, 'in "stdin" object');
        if (sourcefile)
          flags.push(`--sourcefile=${sourcefile}`);
        if (loader2)
          flags.push(`--loader=${loader2}`);
        if (resolveDir)
          stdinResolveDir = resolveDir;
        if (typeof contents === "string")
          stdinContents = encodeUTF8(contents);
        else if (contents instanceof Uint8Array)
          stdinContents = contents;
      }
      let nodePaths = [];
      if (nodePathsInput) {
        for (let value of nodePathsInput) {
          value += "";
          nodePaths.push(value);
        }
      }
      return {
        entries,
        flags,
        write,
        stdinContents,
        stdinResolveDir,
        absWorkingDir,
        nodePaths,
        mangleCache: validateMangleCache(mangleCache)
      };
    }
    function flagsForTransformOptions(callName, options, isTTY2, logLevelDefault) {
      let flags = [];
      let keys = /* @__PURE__ */ Object.create(null);
      pushLogFlags(flags, options, keys, isTTY2, logLevelDefault);
      pushCommonFlags(flags, options, keys);
      let sourcemap = getFlag(options, keys, "sourcemap", mustBeStringOrBoolean);
      let sourcefile = getFlag(options, keys, "sourcefile", mustBeString);
      let loader = getFlag(options, keys, "loader", mustBeString);
      let banner = getFlag(options, keys, "banner", mustBeString);
      let footer = getFlag(options, keys, "footer", mustBeString);
      let mangleCache = getFlag(options, keys, "mangleCache", mustBeObject);
      checkForInvalidFlags(options, keys, `in ${callName}() call`);
      if (sourcemap)
        flags.push(`--sourcemap=${sourcemap === true ? "external" : sourcemap}`);
      if (sourcefile)
        flags.push(`--sourcefile=${sourcefile}`);
      if (loader)
        flags.push(`--loader=${loader}`);
      if (banner)
        flags.push(`--banner=${banner}`);
      if (footer)
        flags.push(`--footer=${footer}`);
      return {
        flags,
        mangleCache: validateMangleCache(mangleCache)
      };
    }
    function createChannel(streamIn) {
      const requestCallbacksByKey = {};
      const closeData = { didClose: false, reason: "" };
      let responseCallbacks = {};
      let nextRequestID = 0;
      let nextBuildKey = 0;
      let stdout = new Uint8Array(16 * 1024);
      let stdoutUsed = 0;
      let readFromStdout = (chunk) => {
        let limit = stdoutUsed + chunk.length;
        if (limit > stdout.length) {
          let swap = new Uint8Array(limit * 2);
          swap.set(stdout);
          stdout = swap;
        }
        stdout.set(chunk, stdoutUsed);
        stdoutUsed += chunk.length;
        let offset = 0;
        while (offset + 4 <= stdoutUsed) {
          let length = readUInt32LE(stdout, offset);
          if (offset + 4 + length > stdoutUsed) {
            break;
          }
          offset += 4;
          handleIncomingPacket(stdout.subarray(offset, offset + length));
          offset += length;
        }
        if (offset > 0) {
          stdout.copyWithin(0, offset, stdoutUsed);
          stdoutUsed -= offset;
        }
      };
      let afterClose = (error) => {
        closeData.didClose = true;
        if (error)
          closeData.reason = ": " + (error.message || error);
        const text = "The service was stopped" + closeData.reason;
        for (let id in responseCallbacks) {
          responseCallbacks[id](text, null);
        }
        responseCallbacks = {};
      };
      let sendRequest = (refs, value, callback) => {
        if (closeData.didClose)
          return callback("The service is no longer running" + closeData.reason, null);
        let id = nextRequestID++;
        responseCallbacks[id] = (error, response) => {
          try {
            callback(error, response);
          } finally {
            if (refs)
              refs.unref();
          }
        };
        if (refs)
          refs.ref();
        streamIn.writeToStdin(encodePacket({ id, isRequest: true, value }));
      };
      let sendResponse = (id, value) => {
        if (closeData.didClose)
          throw new Error("The service is no longer running" + closeData.reason);
        streamIn.writeToStdin(encodePacket({ id, isRequest: false, value }));
      };
      let handleRequest = async (id, request) => {
        try {
          if (request.command === "ping") {
            sendResponse(id, {});
            return;
          }
          if (typeof request.key === "number") {
            const requestCallbacks = requestCallbacksByKey[request.key];
            if (!requestCallbacks) {
              return;
            }
            const callback = requestCallbacks[request.command];
            if (callback) {
              await callback(id, request);
              return;
            }
          }
          throw new Error(`Invalid command: ` + request.command);
        } catch (e) {
          const errors = [extractErrorMessageV8(e, streamIn, null, void 0, "")];
          try {
            sendResponse(id, { errors });
          } catch {
          }
        }
      };
      let isFirstPacket = true;
      let handleIncomingPacket = (bytes) => {
        if (isFirstPacket) {
          isFirstPacket = false;
          let binaryVersion = String.fromCharCode(...bytes);
          if (binaryVersion !== "0.20.2") {
            throw new Error(`Cannot start service: Host version "${"0.20.2"}" does not match binary version ${quote(binaryVersion)}`);
          }
          return;
        }
        let packet = decodePacket(bytes);
        if (packet.isRequest) {
          handleRequest(packet.id, packet.value);
        } else {
          let callback = responseCallbacks[packet.id];
          delete responseCallbacks[packet.id];
          if (packet.value.error)
            callback(packet.value.error, {});
          else
            callback(null, packet.value);
        }
      };
      let buildOrContext = ({ callName, refs, options, isTTY: isTTY2, defaultWD: defaultWD2, callback }) => {
        let refCount = 0;
        const buildKey = nextBuildKey++;
        const requestCallbacks = {};
        const buildRefs = {
          ref() {
            if (++refCount === 1) {
              if (refs)
                refs.ref();
            }
          },
          unref() {
            if (--refCount === 0) {
              delete requestCallbacksByKey[buildKey];
              if (refs)
                refs.unref();
            }
          }
        };
        requestCallbacksByKey[buildKey] = requestCallbacks;
        buildRefs.ref();
        buildOrContextImpl(
          callName,
          buildKey,
          sendRequest,
          sendResponse,
          buildRefs,
          streamIn,
          requestCallbacks,
          options,
          isTTY2,
          defaultWD2,
          (err, res) => {
            try {
              callback(err, res);
            } finally {
              buildRefs.unref();
            }
          }
        );
      };
      let transform2 = ({ callName, refs, input, options, isTTY: isTTY2, fs: fs32, callback }) => {
        const details = createObjectStash();
        let start = (inputPath) => {
          try {
            if (typeof input !== "string" && !(input instanceof Uint8Array))
              throw new Error('The input to "transform" must be a string or a Uint8Array');
            let {
              flags,
              mangleCache
            } = flagsForTransformOptions(callName, options, isTTY2, transformLogLevelDefault);
            let request = {
              command: "transform",
              flags,
              inputFS: inputPath !== null,
              input: inputPath !== null ? encodeUTF8(inputPath) : typeof input === "string" ? encodeUTF8(input) : input
            };
            if (mangleCache)
              request.mangleCache = mangleCache;
            sendRequest(refs, request, (error, response) => {
              if (error)
                return callback(new Error(error), null);
              let errors = replaceDetailsInMessages(response.errors, details);
              let warnings = replaceDetailsInMessages(response.warnings, details);
              let outstanding = 1;
              let next = () => {
                if (--outstanding === 0) {
                  let result = {
                    warnings,
                    code: response.code,
                    map: response.map,
                    mangleCache: void 0,
                    legalComments: void 0
                  };
                  if ("legalComments" in response)
                    result.legalComments = response == null ? void 0 : response.legalComments;
                  if (response.mangleCache)
                    result.mangleCache = response == null ? void 0 : response.mangleCache;
                  callback(null, result);
                }
              };
              if (errors.length > 0)
                return callback(failureErrorWithLog("Transform failed", errors, warnings), null);
              if (response.codeFS) {
                outstanding++;
                fs32.readFile(response.code, (err, contents) => {
                  if (err !== null) {
                    callback(err, null);
                  } else {
                    response.code = contents;
                    next();
                  }
                });
              }
              if (response.mapFS) {
                outstanding++;
                fs32.readFile(response.map, (err, contents) => {
                  if (err !== null) {
                    callback(err, null);
                  } else {
                    response.map = contents;
                    next();
                  }
                });
              }
              next();
            });
          } catch (e) {
            let flags = [];
            try {
              pushLogFlags(flags, options, {}, isTTY2, transformLogLevelDefault);
            } catch {
            }
            const error = extractErrorMessageV8(e, streamIn, details, void 0, "");
            sendRequest(refs, { command: "error", flags, error }, () => {
              error.detail = details.load(error.detail);
              callback(failureErrorWithLog("Transform failed", [error], []), null);
            });
          }
        };
        if ((typeof input === "string" || input instanceof Uint8Array) && input.length > 1024 * 1024) {
          let next = start;
          start = () => fs32.writeFile(input, next);
        }
        start(null);
      };
      let formatMessages2 = ({ callName, refs, messages, options, callback }) => {
        if (!options)
          throw new Error(`Missing second argument in ${callName}() call`);
        let keys = {};
        let kind = getFlag(options, keys, "kind", mustBeString);
        let color = getFlag(options, keys, "color", mustBeBoolean);
        let terminalWidth = getFlag(options, keys, "terminalWidth", mustBeInteger);
        checkForInvalidFlags(options, keys, `in ${callName}() call`);
        if (kind === void 0)
          throw new Error(`Missing "kind" in ${callName}() call`);
        if (kind !== "error" && kind !== "warning")
          throw new Error(`Expected "kind" to be "error" or "warning" in ${callName}() call`);
        let request = {
          command: "format-msgs",
          messages: sanitizeMessages(messages, "messages", null, "", terminalWidth),
          isWarning: kind === "warning"
        };
        if (color !== void 0)
          request.color = color;
        if (terminalWidth !== void 0)
          request.terminalWidth = terminalWidth;
        sendRequest(refs, request, (error, response) => {
          if (error)
            return callback(new Error(error), null);
          callback(null, response.messages);
        });
      };
      let analyzeMetafile2 = ({ callName, refs, metafile, options, callback }) => {
        if (options === void 0)
          options = {};
        let keys = {};
        let color = getFlag(options, keys, "color", mustBeBoolean);
        let verbose = getFlag(options, keys, "verbose", mustBeBoolean);
        checkForInvalidFlags(options, keys, `in ${callName}() call`);
        let request = {
          command: "analyze-metafile",
          metafile
        };
        if (color !== void 0)
          request.color = color;
        if (verbose !== void 0)
          request.verbose = verbose;
        sendRequest(refs, request, (error, response) => {
          if (error)
            return callback(new Error(error), null);
          callback(null, response.result);
        });
      };
      return {
        readFromStdout,
        afterClose,
        service: {
          buildOrContext,
          transform: transform2,
          formatMessages: formatMessages2,
          analyzeMetafile: analyzeMetafile2
        }
      };
    }
    function buildOrContextImpl(callName, buildKey, sendRequest, sendResponse, refs, streamIn, requestCallbacks, options, isTTY2, defaultWD2, callback) {
      const details = createObjectStash();
      const isContext = callName === "context";
      const handleError = (e, pluginName) => {
        const flags = [];
        try {
          pushLogFlags(flags, options, {}, isTTY2, buildLogLevelDefault);
        } catch {
        }
        const message = extractErrorMessageV8(e, streamIn, details, void 0, pluginName);
        sendRequest(refs, { command: "error", flags, error: message }, () => {
          message.detail = details.load(message.detail);
          callback(failureErrorWithLog(isContext ? "Context failed" : "Build failed", [message], []), null);
        });
      };
      let plugins;
      if (typeof options === "object") {
        const value = options.plugins;
        if (value !== void 0) {
          if (!Array.isArray(value))
            return handleError(new Error(`"plugins" must be an array`), "");
          plugins = value;
        }
      }
      if (plugins && plugins.length > 0) {
        if (streamIn.isSync)
          return handleError(new Error("Cannot use plugins in synchronous API calls"), "");
        handlePlugins(
          buildKey,
          sendRequest,
          sendResponse,
          refs,
          streamIn,
          requestCallbacks,
          options,
          plugins,
          details
        ).then(
          (result) => {
            if (!result.ok)
              return handleError(result.error, result.pluginName);
            try {
              buildOrContextContinue(result.requestPlugins, result.runOnEndCallbacks, result.scheduleOnDisposeCallbacks);
            } catch (e) {
              handleError(e, "");
            }
          },
          (e) => handleError(e, "")
        );
        return;
      }
      try {
        buildOrContextContinue(null, (result, done) => done([], []), () => {
        });
      } catch (e) {
        handleError(e, "");
      }
      function buildOrContextContinue(requestPlugins, runOnEndCallbacks, scheduleOnDisposeCallbacks) {
        const writeDefault = streamIn.hasFS;
        const {
          entries,
          flags,
          write,
          stdinContents,
          stdinResolveDir,
          absWorkingDir,
          nodePaths,
          mangleCache
        } = flagsForBuildOptions(callName, options, isTTY2, buildLogLevelDefault, writeDefault);
        if (write && !streamIn.hasFS)
          throw new Error(`The "write" option is unavailable in this environment`);
        const request = {
          command: "build",
          key: buildKey,
          entries,
          flags,
          write,
          stdinContents,
          stdinResolveDir,
          absWorkingDir: absWorkingDir || defaultWD2,
          nodePaths,
          context: isContext
        };
        if (requestPlugins)
          request.plugins = requestPlugins;
        if (mangleCache)
          request.mangleCache = mangleCache;
        const buildResponseToResult = (response, callback2) => {
          const result = {
            errors: replaceDetailsInMessages(response.errors, details),
            warnings: replaceDetailsInMessages(response.warnings, details),
            outputFiles: void 0,
            metafile: void 0,
            mangleCache: void 0
          };
          const originalErrors = result.errors.slice();
          const originalWarnings = result.warnings.slice();
          if (response.outputFiles)
            result.outputFiles = response.outputFiles.map(convertOutputFiles);
          if (response.metafile)
            result.metafile = JSON.parse(response.metafile);
          if (response.mangleCache)
            result.mangleCache = response.mangleCache;
          if (response.writeToStdout !== void 0)
            console.log(decodeUTF8(response.writeToStdout).replace(/\n$/, ""));
          runOnEndCallbacks(result, (onEndErrors, onEndWarnings) => {
            if (originalErrors.length > 0 || onEndErrors.length > 0) {
              const error = failureErrorWithLog("Build failed", originalErrors.concat(onEndErrors), originalWarnings.concat(onEndWarnings));
              return callback2(error, null, onEndErrors, onEndWarnings);
            }
            callback2(null, result, onEndErrors, onEndWarnings);
          });
        };
        let latestResultPromise;
        let provideLatestResult;
        if (isContext)
          requestCallbacks["on-end"] = (id, request2) => new Promise((resolve2) => {
            buildResponseToResult(request2, (err, result, onEndErrors, onEndWarnings) => {
              const response = {
                errors: onEndErrors,
                warnings: onEndWarnings
              };
              if (provideLatestResult)
                provideLatestResult(err, result);
              latestResultPromise = void 0;
              provideLatestResult = void 0;
              sendResponse(id, response);
              resolve2();
            });
          });
        sendRequest(refs, request, (error, response) => {
          if (error)
            return callback(new Error(error), null);
          if (!isContext) {
            return buildResponseToResult(response, (err, res) => {
              scheduleOnDisposeCallbacks();
              return callback(err, res);
            });
          }
          if (response.errors.length > 0) {
            return callback(failureErrorWithLog("Context failed", response.errors, response.warnings), null);
          }
          let didDispose = false;
          const result = {
            rebuild: () => {
              if (!latestResultPromise)
                latestResultPromise = new Promise((resolve2, reject) => {
                  let settlePromise;
                  provideLatestResult = (err, result2) => {
                    if (!settlePromise)
                      settlePromise = () => err ? reject(err) : resolve2(result2);
                  };
                  const triggerAnotherBuild = () => {
                    const request2 = {
                      command: "rebuild",
                      key: buildKey
                    };
                    sendRequest(refs, request2, (error2, response2) => {
                      if (error2) {
                        reject(new Error(error2));
                      } else if (settlePromise) {
                        settlePromise();
                      } else {
                        triggerAnotherBuild();
                      }
                    });
                  };
                  triggerAnotherBuild();
                });
              return latestResultPromise;
            },
            watch: (options2 = {}) => new Promise((resolve2, reject) => {
              if (!streamIn.hasFS)
                throw new Error(`Cannot use the "watch" API in this environment`);
              const keys = {};
              checkForInvalidFlags(options2, keys, `in watch() call`);
              const request2 = {
                command: "watch",
                key: buildKey
              };
              sendRequest(refs, request2, (error2) => {
                if (error2)
                  reject(new Error(error2));
                else
                  resolve2(void 0);
              });
            }),
            serve: (options2 = {}) => new Promise((resolve2, reject) => {
              if (!streamIn.hasFS)
                throw new Error(`Cannot use the "serve" API in this environment`);
              const keys = {};
              const port = getFlag(options2, keys, "port", mustBeInteger);
              const host = getFlag(options2, keys, "host", mustBeString);
              const servedir = getFlag(options2, keys, "servedir", mustBeString);
              const keyfile = getFlag(options2, keys, "keyfile", mustBeString);
              const certfile = getFlag(options2, keys, "certfile", mustBeString);
              const fallback = getFlag(options2, keys, "fallback", mustBeString);
              const onRequest = getFlag(options2, keys, "onRequest", mustBeFunction);
              checkForInvalidFlags(options2, keys, `in serve() call`);
              const request2 = {
                command: "serve",
                key: buildKey,
                onRequest: !!onRequest
              };
              if (port !== void 0)
                request2.port = port;
              if (host !== void 0)
                request2.host = host;
              if (servedir !== void 0)
                request2.servedir = servedir;
              if (keyfile !== void 0)
                request2.keyfile = keyfile;
              if (certfile !== void 0)
                request2.certfile = certfile;
              if (fallback !== void 0)
                request2.fallback = fallback;
              sendRequest(refs, request2, (error2, response2) => {
                if (error2)
                  return reject(new Error(error2));
                if (onRequest) {
                  requestCallbacks["serve-request"] = (id, request3) => {
                    onRequest(request3.args);
                    sendResponse(id, {});
                  };
                }
                resolve2(response2);
              });
            }),
            cancel: () => new Promise((resolve2) => {
              if (didDispose)
                return resolve2();
              const request2 = {
                command: "cancel",
                key: buildKey
              };
              sendRequest(refs, request2, () => {
                resolve2();
              });
            }),
            dispose: () => new Promise((resolve2) => {
              if (didDispose)
                return resolve2();
              didDispose = true;
              const request2 = {
                command: "dispose",
                key: buildKey
              };
              sendRequest(refs, request2, () => {
                resolve2();
                scheduleOnDisposeCallbacks();
                refs.unref();
              });
            })
          };
          refs.ref();
          callback(null, result);
        });
      }
    }
    var handlePlugins = async (buildKey, sendRequest, sendResponse, refs, streamIn, requestCallbacks, initialOptions, plugins, details) => {
      let onStartCallbacks = [];
      let onEndCallbacks = [];
      let onResolveCallbacks = {};
      let onLoadCallbacks = {};
      let onDisposeCallbacks = [];
      let nextCallbackID = 0;
      let i = 0;
      let requestPlugins = [];
      let isSetupDone = false;
      plugins = [...plugins];
      for (let item of plugins) {
        let keys = {};
        if (typeof item !== "object")
          throw new Error(`Plugin at index ${i} must be an object`);
        const name = getFlag(item, keys, "name", mustBeString);
        if (typeof name !== "string" || name === "")
          throw new Error(`Plugin at index ${i} is missing a name`);
        try {
          let setup = getFlag(item, keys, "setup", mustBeFunction);
          if (typeof setup !== "function")
            throw new Error(`Plugin is missing a setup function`);
          checkForInvalidFlags(item, keys, `on plugin ${quote(name)}`);
          let plugin = {
            name,
            onStart: false,
            onEnd: false,
            onResolve: [],
            onLoad: []
          };
          i++;
          let resolve2 = (path32, options = {}) => {
            if (!isSetupDone)
              throw new Error('Cannot call "resolve" before plugin setup has completed');
            if (typeof path32 !== "string")
              throw new Error(`The path to resolve must be a string`);
            let keys2 = /* @__PURE__ */ Object.create(null);
            let pluginName = getFlag(options, keys2, "pluginName", mustBeString);
            let importer = getFlag(options, keys2, "importer", mustBeString);
            let namespace = getFlag(options, keys2, "namespace", mustBeString);
            let resolveDir = getFlag(options, keys2, "resolveDir", mustBeString);
            let kind = getFlag(options, keys2, "kind", mustBeString);
            let pluginData = getFlag(options, keys2, "pluginData", canBeAnything);
            checkForInvalidFlags(options, keys2, "in resolve() call");
            return new Promise((resolve22, reject) => {
              const request = {
                command: "resolve",
                path: path32,
                key: buildKey,
                pluginName: name
              };
              if (pluginName != null)
                request.pluginName = pluginName;
              if (importer != null)
                request.importer = importer;
              if (namespace != null)
                request.namespace = namespace;
              if (resolveDir != null)
                request.resolveDir = resolveDir;
              if (kind != null)
                request.kind = kind;
              else
                throw new Error(`Must specify "kind" when calling "resolve"`);
              if (pluginData != null)
                request.pluginData = details.store(pluginData);
              sendRequest(refs, request, (error, response) => {
                if (error !== null)
                  reject(new Error(error));
                else
                  resolve22({
                    errors: replaceDetailsInMessages(response.errors, details),
                    warnings: replaceDetailsInMessages(response.warnings, details),
                    path: response.path,
                    external: response.external,
                    sideEffects: response.sideEffects,
                    namespace: response.namespace,
                    suffix: response.suffix,
                    pluginData: details.load(response.pluginData)
                  });
              });
            });
          };
          let promise = setup({
            initialOptions,
            resolve: resolve2,
            onStart(callback) {
              let registeredText = `This error came from the "onStart" callback registered here:`;
              let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onStart");
              onStartCallbacks.push({ name, callback, note: registeredNote });
              plugin.onStart = true;
            },
            onEnd(callback) {
              let registeredText = `This error came from the "onEnd" callback registered here:`;
              let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onEnd");
              onEndCallbacks.push({ name, callback, note: registeredNote });
              plugin.onEnd = true;
            },
            onResolve(options, callback) {
              let registeredText = `This error came from the "onResolve" callback registered here:`;
              let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onResolve");
              let keys2 = {};
              let filter = getFlag(options, keys2, "filter", mustBeRegExp);
              let namespace = getFlag(options, keys2, "namespace", mustBeString);
              checkForInvalidFlags(options, keys2, `in onResolve() call for plugin ${quote(name)}`);
              if (filter == null)
                throw new Error(`onResolve() call is missing a filter`);
              let id = nextCallbackID++;
              onResolveCallbacks[id] = { name, callback, note: registeredNote };
              plugin.onResolve.push({ id, filter: filter.source, namespace: namespace || "" });
            },
            onLoad(options, callback) {
              let registeredText = `This error came from the "onLoad" callback registered here:`;
              let registeredNote = extractCallerV8(new Error(registeredText), streamIn, "onLoad");
              let keys2 = {};
              let filter = getFlag(options, keys2, "filter", mustBeRegExp);
              let namespace = getFlag(options, keys2, "namespace", mustBeString);
              checkForInvalidFlags(options, keys2, `in onLoad() call for plugin ${quote(name)}`);
              if (filter == null)
                throw new Error(`onLoad() call is missing a filter`);
              let id = nextCallbackID++;
              onLoadCallbacks[id] = { name, callback, note: registeredNote };
              plugin.onLoad.push({ id, filter: filter.source, namespace: namespace || "" });
            },
            onDispose(callback) {
              onDisposeCallbacks.push(callback);
            },
            esbuild: streamIn.esbuild
          });
          if (promise)
            await promise;
          requestPlugins.push(plugin);
        } catch (e) {
          return { ok: false, error: e, pluginName: name };
        }
      }
      requestCallbacks["on-start"] = async (id, request) => {
        let response = { errors: [], warnings: [] };
        await Promise.all(onStartCallbacks.map(async ({ name, callback, note }) => {
          try {
            let result = await callback();
            if (result != null) {
              if (typeof result !== "object")
                throw new Error(`Expected onStart() callback in plugin ${quote(name)} to return an object`);
              let keys = {};
              let errors = getFlag(result, keys, "errors", mustBeArray);
              let warnings = getFlag(result, keys, "warnings", mustBeArray);
              checkForInvalidFlags(result, keys, `from onStart() callback in plugin ${quote(name)}`);
              if (errors != null)
                response.errors.push(...sanitizeMessages(errors, "errors", details, name, void 0));
              if (warnings != null)
                response.warnings.push(...sanitizeMessages(warnings, "warnings", details, name, void 0));
            }
          } catch (e) {
            response.errors.push(extractErrorMessageV8(e, streamIn, details, note && note(), name));
          }
        }));
        sendResponse(id, response);
      };
      requestCallbacks["on-resolve"] = async (id, request) => {
        let response = {}, name = "", callback, note;
        for (let id2 of request.ids) {
          try {
            ({ name, callback, note } = onResolveCallbacks[id2]);
            let result = await callback({
              path: request.path,
              importer: request.importer,
              namespace: request.namespace,
              resolveDir: request.resolveDir,
              kind: request.kind,
              pluginData: details.load(request.pluginData)
            });
            if (result != null) {
              if (typeof result !== "object")
                throw new Error(`Expected onResolve() callback in plugin ${quote(name)} to return an object`);
              let keys = {};
              let pluginName = getFlag(result, keys, "pluginName", mustBeString);
              let path32 = getFlag(result, keys, "path", mustBeString);
              let namespace = getFlag(result, keys, "namespace", mustBeString);
              let suffix = getFlag(result, keys, "suffix", mustBeString);
              let external = getFlag(result, keys, "external", mustBeBoolean);
              let sideEffects = getFlag(result, keys, "sideEffects", mustBeBoolean);
              let pluginData = getFlag(result, keys, "pluginData", canBeAnything);
              let errors = getFlag(result, keys, "errors", mustBeArray);
              let warnings = getFlag(result, keys, "warnings", mustBeArray);
              let watchFiles = getFlag(result, keys, "watchFiles", mustBeArray);
              let watchDirs = getFlag(result, keys, "watchDirs", mustBeArray);
              checkForInvalidFlags(result, keys, `from onResolve() callback in plugin ${quote(name)}`);
              response.id = id2;
              if (pluginName != null)
                response.pluginName = pluginName;
              if (path32 != null)
                response.path = path32;
              if (namespace != null)
                response.namespace = namespace;
              if (suffix != null)
                response.suffix = suffix;
              if (external != null)
                response.external = external;
              if (sideEffects != null)
                response.sideEffects = sideEffects;
              if (pluginData != null)
                response.pluginData = details.store(pluginData);
              if (errors != null)
                response.errors = sanitizeMessages(errors, "errors", details, name, void 0);
              if (warnings != null)
                response.warnings = sanitizeMessages(warnings, "warnings", details, name, void 0);
              if (watchFiles != null)
                response.watchFiles = sanitizeStringArray(watchFiles, "watchFiles");
              if (watchDirs != null)
                response.watchDirs = sanitizeStringArray(watchDirs, "watchDirs");
              break;
            }
          } catch (e) {
            response = { id: id2, errors: [extractErrorMessageV8(e, streamIn, details, note && note(), name)] };
            break;
          }
        }
        sendResponse(id, response);
      };
      requestCallbacks["on-load"] = async (id, request) => {
        let response = {}, name = "", callback, note;
        for (let id2 of request.ids) {
          try {
            ({ name, callback, note } = onLoadCallbacks[id2]);
            let result = await callback({
              path: request.path,
              namespace: request.namespace,
              suffix: request.suffix,
              pluginData: details.load(request.pluginData),
              with: request.with
            });
            if (result != null) {
              if (typeof result !== "object")
                throw new Error(`Expected onLoad() callback in plugin ${quote(name)} to return an object`);
              let keys = {};
              let pluginName = getFlag(result, keys, "pluginName", mustBeString);
              let contents = getFlag(result, keys, "contents", mustBeStringOrUint8Array);
              let resolveDir = getFlag(result, keys, "resolveDir", mustBeString);
              let pluginData = getFlag(result, keys, "pluginData", canBeAnything);
              let loader = getFlag(result, keys, "loader", mustBeString);
              let errors = getFlag(result, keys, "errors", mustBeArray);
              let warnings = getFlag(result, keys, "warnings", mustBeArray);
              let watchFiles = getFlag(result, keys, "watchFiles", mustBeArray);
              let watchDirs = getFlag(result, keys, "watchDirs", mustBeArray);
              checkForInvalidFlags(result, keys, `from onLoad() callback in plugin ${quote(name)}`);
              response.id = id2;
              if (pluginName != null)
                response.pluginName = pluginName;
              if (contents instanceof Uint8Array)
                response.contents = contents;
              else if (contents != null)
                response.contents = encodeUTF8(contents);
              if (resolveDir != null)
                response.resolveDir = resolveDir;
              if (pluginData != null)
                response.pluginData = details.store(pluginData);
              if (loader != null)
                response.loader = loader;
              if (errors != null)
                response.errors = sanitizeMessages(errors, "errors", details, name, void 0);
              if (warnings != null)
                response.warnings = sanitizeMessages(warnings, "warnings", details, name, void 0);
              if (watchFiles != null)
                response.watchFiles = sanitizeStringArray(watchFiles, "watchFiles");
              if (watchDirs != null)
                response.watchDirs = sanitizeStringArray(watchDirs, "watchDirs");
              break;
            }
          } catch (e) {
            response = { id: id2, errors: [extractErrorMessageV8(e, streamIn, details, note && note(), name)] };
            break;
          }
        }
        sendResponse(id, response);
      };
      let runOnEndCallbacks = (result, done) => done([], []);
      if (onEndCallbacks.length > 0) {
        runOnEndCallbacks = (result, done) => {
          (async () => {
            const onEndErrors = [];
            const onEndWarnings = [];
            for (const { name, callback, note } of onEndCallbacks) {
              let newErrors;
              let newWarnings;
              try {
                const value = await callback(result);
                if (value != null) {
                  if (typeof value !== "object")
                    throw new Error(`Expected onEnd() callback in plugin ${quote(name)} to return an object`);
                  let keys = {};
                  let errors = getFlag(value, keys, "errors", mustBeArray);
                  let warnings = getFlag(value, keys, "warnings", mustBeArray);
                  checkForInvalidFlags(value, keys, `from onEnd() callback in plugin ${quote(name)}`);
                  if (errors != null)
                    newErrors = sanitizeMessages(errors, "errors", details, name, void 0);
                  if (warnings != null)
                    newWarnings = sanitizeMessages(warnings, "warnings", details, name, void 0);
                }
              } catch (e) {
                newErrors = [extractErrorMessageV8(e, streamIn, details, note && note(), name)];
              }
              if (newErrors) {
                onEndErrors.push(...newErrors);
                try {
                  result.errors.push(...newErrors);
                } catch {
                }
              }
              if (newWarnings) {
                onEndWarnings.push(...newWarnings);
                try {
                  result.warnings.push(...newWarnings);
                } catch {
                }
              }
            }
            done(onEndErrors, onEndWarnings);
          })();
        };
      }
      let scheduleOnDisposeCallbacks = () => {
        for (const cb of onDisposeCallbacks) {
          setTimeout(() => cb(), 0);
        }
      };
      isSetupDone = true;
      return {
        ok: true,
        requestPlugins,
        runOnEndCallbacks,
        scheduleOnDisposeCallbacks
      };
    };
    function createObjectStash() {
      const map = /* @__PURE__ */ new Map();
      let nextID = 0;
      return {
        load(id) {
          return map.get(id);
        },
        store(value) {
          if (value === void 0)
            return -1;
          const id = nextID++;
          map.set(id, value);
          return id;
        }
      };
    }
    function extractCallerV8(e, streamIn, ident) {
      let note;
      let tried = false;
      return () => {
        if (tried)
          return note;
        tried = true;
        try {
          let lines = (e.stack + "").split("\n");
          lines.splice(1, 1);
          let location = parseStackLinesV8(streamIn, lines, ident);
          if (location) {
            note = { text: e.message, location };
            return note;
          }
        } catch {
        }
      };
    }
    function extractErrorMessageV8(e, streamIn, stash, note, pluginName) {
      let text = "Internal error";
      let location = null;
      try {
        text = (e && e.message || e) + "";
      } catch {
      }
      try {
        location = parseStackLinesV8(streamIn, (e.stack + "").split("\n"), "");
      } catch {
      }
      return { id: "", pluginName, text, location, notes: note ? [note] : [], detail: stash ? stash.store(e) : -1 };
    }
    function parseStackLinesV8(streamIn, lines, ident) {
      let at = "    at ";
      if (streamIn.readFileSync && !lines[0].startsWith(at) && lines[1].startsWith(at)) {
        for (let i = 1; i < lines.length; i++) {
          let line = lines[i];
          if (!line.startsWith(at))
            continue;
          line = line.slice(at.length);
          while (true) {
            let match = /^(?:new |async )?\S+ \((.*)\)$/.exec(line);
            if (match) {
              line = match[1];
              continue;
            }
            match = /^eval at \S+ \((.*)\)(?:, \S+:\d+:\d+)?$/.exec(line);
            if (match) {
              line = match[1];
              continue;
            }
            match = /^(\S+):(\d+):(\d+)$/.exec(line);
            if (match) {
              let contents;
              try {
                contents = streamIn.readFileSync(match[1], "utf8");
              } catch {
                break;
              }
              let lineText = contents.split(/\r\n|\r|\n|\u2028|\u2029/)[+match[2] - 1] || "";
              let column = +match[3] - 1;
              let length = lineText.slice(column, column + ident.length) === ident ? ident.length : 0;
              return {
                file: match[1],
                namespace: "file",
                line: +match[2],
                column: encodeUTF8(lineText.slice(0, column)).length,
                length: encodeUTF8(lineText.slice(column, column + length)).length,
                lineText: lineText + "\n" + lines.slice(1).join("\n"),
                suggestion: ""
              };
            }
            break;
          }
        }
      }
      return null;
    }
    function failureErrorWithLog(text, errors, warnings) {
      let limit = 5;
      text += errors.length < 1 ? "" : ` with ${errors.length} error${errors.length < 2 ? "" : "s"}:` + errors.slice(0, limit + 1).map((e, i) => {
        if (i === limit)
          return "\n...";
        if (!e.location)
          return `
error: ${e.text}`;
        let { file, line, column } = e.location;
        let pluginText = e.pluginName ? `[plugin: ${e.pluginName}] ` : "";
        return `
${file}:${line}:${column}: ERROR: ${pluginText}${e.text}`;
      }).join("");
      let error = new Error(text);
      for (const [key, value] of [["errors", errors], ["warnings", warnings]]) {
        Object.defineProperty(error, key, {
          configurable: true,
          enumerable: true,
          get: () => value,
          set: (value2) => Object.defineProperty(error, key, {
            configurable: true,
            enumerable: true,
            value: value2
          })
        });
      }
      return error;
    }
    function replaceDetailsInMessages(messages, stash) {
      for (const message of messages) {
        message.detail = stash.load(message.detail);
      }
      return messages;
    }
    function sanitizeLocation(location, where, terminalWidth) {
      if (location == null)
        return null;
      let keys = {};
      let file = getFlag(location, keys, "file", mustBeString);
      let namespace = getFlag(location, keys, "namespace", mustBeString);
      let line = getFlag(location, keys, "line", mustBeInteger);
      let column = getFlag(location, keys, "column", mustBeInteger);
      let length = getFlag(location, keys, "length", mustBeInteger);
      let lineText = getFlag(location, keys, "lineText", mustBeString);
      let suggestion = getFlag(location, keys, "suggestion", mustBeString);
      checkForInvalidFlags(location, keys, where);
      if (lineText) {
        const relevantASCII = lineText.slice(
          0,
          (column && column > 0 ? column : 0) + (length && length > 0 ? length : 0) + (terminalWidth && terminalWidth > 0 ? terminalWidth : 80)
        );
        if (!/[\x7F-\uFFFF]/.test(relevantASCII) && !/\n/.test(lineText)) {
          lineText = relevantASCII;
        }
      }
      return {
        file: file || "",
        namespace: namespace || "",
        line: line || 0,
        column: column || 0,
        length: length || 0,
        lineText: lineText || "",
        suggestion: suggestion || ""
      };
    }
    function sanitizeMessages(messages, property, stash, fallbackPluginName, terminalWidth) {
      let messagesClone = [];
      let index = 0;
      for (const message of messages) {
        let keys = {};
        let id = getFlag(message, keys, "id", mustBeString);
        let pluginName = getFlag(message, keys, "pluginName", mustBeString);
        let text = getFlag(message, keys, "text", mustBeString);
        let location = getFlag(message, keys, "location", mustBeObjectOrNull);
        let notes = getFlag(message, keys, "notes", mustBeArray);
        let detail = getFlag(message, keys, "detail", canBeAnything);
        let where = `in element ${index} of "${property}"`;
        checkForInvalidFlags(message, keys, where);
        let notesClone = [];
        if (notes) {
          for (const note of notes) {
            let noteKeys = {};
            let noteText = getFlag(note, noteKeys, "text", mustBeString);
            let noteLocation = getFlag(note, noteKeys, "location", mustBeObjectOrNull);
            checkForInvalidFlags(note, noteKeys, where);
            notesClone.push({
              text: noteText || "",
              location: sanitizeLocation(noteLocation, where, terminalWidth)
            });
          }
        }
        messagesClone.push({
          id: id || "",
          pluginName: pluginName || fallbackPluginName,
          text: text || "",
          location: sanitizeLocation(location, where, terminalWidth),
          notes: notesClone,
          detail: stash ? stash.store(detail) : -1
        });
        index++;
      }
      return messagesClone;
    }
    function sanitizeStringArray(values, property) {
      const result = [];
      for (const value of values) {
        if (typeof value !== "string")
          throw new Error(`${quote(property)} must be an array of strings`);
        result.push(value);
      }
      return result;
    }
    function convertOutputFiles({ path: path32, contents, hash }) {
      let text = null;
      return {
        path: path32,
        contents,
        hash,
        get text() {
          const binary = this.contents;
          if (text === null || binary !== contents) {
            contents = binary;
            text = decodeUTF8(binary);
          }
          return text;
        }
      };
    }
    var fs4 = __require("fs");
    var os = __require("os");
    var path4 = __require("path");
    var ESBUILD_BINARY_PATH = process.env.ESBUILD_BINARY_PATH || ESBUILD_BINARY_PATH;
    var isValidBinaryPath = (x) => !!x && x !== "/usr/bin/esbuild";
    var packageDarwin_arm64 = "@esbuild/darwin-arm64";
    var packageDarwin_x64 = "@esbuild/darwin-x64";
    var knownWindowsPackages = {
      "win32 arm64 LE": "@esbuild/win32-arm64",
      "win32 ia32 LE": "@esbuild/win32-ia32",
      "win32 x64 LE": "@esbuild/win32-x64"
    };
    var knownUnixlikePackages = {
      "aix ppc64 BE": "@esbuild/aix-ppc64",
      "android arm64 LE": "@esbuild/android-arm64",
      "darwin arm64 LE": "@esbuild/darwin-arm64",
      "darwin x64 LE": "@esbuild/darwin-x64",
      "freebsd arm64 LE": "@esbuild/freebsd-arm64",
      "freebsd x64 LE": "@esbuild/freebsd-x64",
      "linux arm LE": "@esbuild/linux-arm",
      "linux arm64 LE": "@esbuild/linux-arm64",
      "linux ia32 LE": "@esbuild/linux-ia32",
      "linux mips64el LE": "@esbuild/linux-mips64el",
      "linux ppc64 LE": "@esbuild/linux-ppc64",
      "linux riscv64 LE": "@esbuild/linux-riscv64",
      "linux s390x BE": "@esbuild/linux-s390x",
      "linux x64 LE": "@esbuild/linux-x64",
      "linux loong64 LE": "@esbuild/linux-loong64",
      "netbsd x64 LE": "@esbuild/netbsd-x64",
      "openbsd x64 LE": "@esbuild/openbsd-x64",
      "sunos x64 LE": "@esbuild/sunos-x64"
    };
    var knownWebAssemblyFallbackPackages = {
      "android arm LE": "@esbuild/android-arm",
      "android x64 LE": "@esbuild/android-x64"
    };
    function pkgAndSubpathForCurrentPlatform() {
      let pkg;
      let subpath;
      let isWASM = false;
      let platformKey = `${process.platform} ${os.arch()} ${os.endianness()}`;
      if (platformKey in knownWindowsPackages) {
        pkg = knownWindowsPackages[platformKey];
        subpath = "esbuild.exe";
      } else if (platformKey in knownUnixlikePackages) {
        pkg = knownUnixlikePackages[platformKey];
        subpath = "bin/esbuild";
      } else if (platformKey in knownWebAssemblyFallbackPackages) {
        pkg = knownWebAssemblyFallbackPackages[platformKey];
        subpath = "bin/esbuild";
        isWASM = true;
      } else {
        throw new Error(`Unsupported platform: ${platformKey}`);
      }
      return { pkg, subpath, isWASM };
    }
    function pkgForSomeOtherPlatform() {
      const libMainJS = __require.resolve("esbuild");
      const nodeModulesDirectory = path4.dirname(path4.dirname(path4.dirname(libMainJS)));
      if (path4.basename(nodeModulesDirectory) === "node_modules") {
        for (const unixKey in knownUnixlikePackages) {
          try {
            const pkg = knownUnixlikePackages[unixKey];
            if (fs4.existsSync(path4.join(nodeModulesDirectory, pkg)))
              return pkg;
          } catch {
          }
        }
        for (const windowsKey in knownWindowsPackages) {
          try {
            const pkg = knownWindowsPackages[windowsKey];
            if (fs4.existsSync(path4.join(nodeModulesDirectory, pkg)))
              return pkg;
          } catch {
          }
        }
      }
      return null;
    }
    function downloadedBinPath(pkg, subpath) {
      const esbuildLibDir = path4.dirname(__require.resolve("esbuild"));
      return path4.join(esbuildLibDir, `downloaded-${pkg.replace("/", "-")}-${path4.basename(subpath)}`);
    }
    function generateBinPath() {
      if (isValidBinaryPath(ESBUILD_BINARY_PATH)) {
        if (!fs4.existsSync(ESBUILD_BINARY_PATH)) {
          console.warn(`[esbuild] Ignoring bad configuration: ESBUILD_BINARY_PATH=${ESBUILD_BINARY_PATH}`);
        } else {
          return { binPath: ESBUILD_BINARY_PATH, isWASM: false };
        }
      }
      const { pkg, subpath, isWASM } = pkgAndSubpathForCurrentPlatform();
      let binPath;
      try {
        binPath = __require.resolve(`${pkg}/${subpath}`);
      } catch (e) {
        binPath = downloadedBinPath(pkg, subpath);
        if (!fs4.existsSync(binPath)) {
          try {
            __require.resolve(pkg);
          } catch {
            const otherPkg = pkgForSomeOtherPlatform();
            if (otherPkg) {
              let suggestions = `
Specifically the "${otherPkg}" package is present but this platform
needs the "${pkg}" package instead. People often get into this
situation by installing esbuild on Windows or macOS and copying "node_modules"
into a Docker image that runs Linux, or by copying "node_modules" between
Windows and WSL environments.

If you are installing with npm, you can try not copying the "node_modules"
directory when you copy the files over, and running "npm ci" or "npm install"
on the destination platform after the copy. Or you could consider using yarn
instead of npm which has built-in support for installing a package on multiple
platforms simultaneously.

If you are installing with yarn, you can try listing both this platform and the
other platform in your ".yarnrc.yml" file using the "supportedArchitectures"
feature: https://yarnpkg.com/configuration/yarnrc/#supportedArchitectures
Keep in mind that this means multiple copies of esbuild will be present.
`;
              if (pkg === packageDarwin_x64 && otherPkg === packageDarwin_arm64 || pkg === packageDarwin_arm64 && otherPkg === packageDarwin_x64) {
                suggestions = `
Specifically the "${otherPkg}" package is present but this platform
needs the "${pkg}" package instead. People often get into this
situation by installing esbuild with npm running inside of Rosetta 2 and then
trying to use it with node running outside of Rosetta 2, or vice versa (Rosetta
2 is Apple's on-the-fly x86_64-to-arm64 translation service).

If you are installing with npm, you can try ensuring that both npm and node are
not running under Rosetta 2 and then reinstalling esbuild. This likely involves
changing how you installed npm and/or node. For example, installing node with
the universal installer here should work: https://nodejs.org/en/download/. Or
you could consider using yarn instead of npm which has built-in support for
installing a package on multiple platforms simultaneously.

If you are installing with yarn, you can try listing both "arm64" and "x64"
in your ".yarnrc.yml" file using the "supportedArchitectures" feature:
https://yarnpkg.com/configuration/yarnrc/#supportedArchitectures
Keep in mind that this means multiple copies of esbuild will be present.
`;
              }
              throw new Error(`
You installed esbuild for another platform than the one you're currently using.
This won't work because esbuild is written with native code and needs to
install a platform-specific binary executable.
${suggestions}
Another alternative is to use the "esbuild-wasm" package instead, which works
the same way on all platforms. But it comes with a heavy performance cost and
can sometimes be 10x slower than the "esbuild" package, so you may also not
want to do that.
`);
            }
            throw new Error(`The package "${pkg}" could not be found, and is needed by esbuild.

If you are installing esbuild with npm, make sure that you don't specify the
"--no-optional" or "--omit=optional" flags. The "optionalDependencies" feature
of "package.json" is used by esbuild to install the correct binary executable
for your current platform.`);
          }
          throw e;
        }
      }
      if (/\.zip\//.test(binPath)) {
        let pnpapi;
        try {
          pnpapi = __require("pnpapi");
        } catch (e) {
        }
        if (pnpapi) {
          const root = pnpapi.getPackageInformation(pnpapi.topLevel).packageLocation;
          const binTargetPath = path4.join(
            root,
            "node_modules",
            ".cache",
            "esbuild",
            `pnpapi-${pkg.replace("/", "-")}-${"0.20.2"}-${path4.basename(subpath)}`
          );
          if (!fs4.existsSync(binTargetPath)) {
            fs4.mkdirSync(path4.dirname(binTargetPath), { recursive: true });
            fs4.copyFileSync(binPath, binTargetPath);
            fs4.chmodSync(binTargetPath, 493);
          }
          return { binPath: binTargetPath, isWASM };
        }
      }
      return { binPath, isWASM };
    }
    var child_process = __require("child_process");
    var crypto = __require("crypto");
    var path22 = __require("path");
    var fs22 = __require("fs");
    var os2 = __require("os");
    var tty = __require("tty");
    var worker_threads;
    if (process.env.ESBUILD_WORKER_THREADS !== "0") {
      try {
        worker_threads = __require("worker_threads");
      } catch {
      }
      let [major, minor] = process.versions.node.split(".");
      if (
        // <v12.17.0 does not work
        +major < 12 || +major === 12 && +minor < 17 || +major === 13 && +minor < 13
      ) {
        worker_threads = void 0;
      }
    }
    var _a;
    var isInternalWorkerThread = ((_a = worker_threads == null ? void 0 : worker_threads.workerData) == null ? void 0 : _a.esbuildVersion) === "0.20.2";
    var esbuildCommandAndArgs = () => {
      if ((!ESBUILD_BINARY_PATH || false) && (path22.basename(__filename) !== "main.js" || path22.basename(__dirname) !== "lib")) {
        throw new Error(
          `The esbuild JavaScript API cannot be bundled. Please mark the "esbuild" package as external so it's not included in the bundle.

More information: The file containing the code for esbuild's JavaScript API (${__filename}) does not appear to be inside the esbuild package on the file system, which usually means that the esbuild package was bundled into another file. This is problematic because the API needs to run a binary executable inside the esbuild package which is located using a relative path from the API code to the executable. If the esbuild package is bundled, the relative path will be incorrect and the executable won't be found.`
        );
      }
      if (false) {
        return ["node", [path22.join(__dirname, "..", "bin", "esbuild")]];
      } else {
        const { binPath, isWASM } = generateBinPath();
        if (isWASM) {
          return ["node", [binPath]];
        } else {
          return [binPath, []];
        }
      }
    };
    var isTTY = () => tty.isatty(2);
    var fsSync = {
      readFile(tempFile, callback) {
        try {
          let contents = fs22.readFileSync(tempFile, "utf8");
          try {
            fs22.unlinkSync(tempFile);
          } catch {
          }
          callback(null, contents);
        } catch (err) {
          callback(err, null);
        }
      },
      writeFile(contents, callback) {
        try {
          let tempFile = randomFileName();
          fs22.writeFileSync(tempFile, contents);
          callback(tempFile);
        } catch {
          callback(null);
        }
      }
    };
    var fsAsync = {
      readFile(tempFile, callback) {
        try {
          fs22.readFile(tempFile, "utf8", (err, contents) => {
            try {
              fs22.unlink(tempFile, () => callback(err, contents));
            } catch {
              callback(err, contents);
            }
          });
        } catch (err) {
          callback(err, null);
        }
      },
      writeFile(contents, callback) {
        try {
          let tempFile = randomFileName();
          fs22.writeFile(tempFile, contents, (err) => err !== null ? callback(null) : callback(tempFile));
        } catch {
          callback(null);
        }
      }
    };
    var version = "0.20.2";
    var build = (options) => ensureServiceIsRunning().build(options);
    var context = (buildOptions) => ensureServiceIsRunning().context(buildOptions);
    var transform = (input, options) => ensureServiceIsRunning().transform(input, options);
    var formatMessages = (messages, options) => ensureServiceIsRunning().formatMessages(messages, options);
    var analyzeMetafile = (messages, options) => ensureServiceIsRunning().analyzeMetafile(messages, options);
    var buildSync = (options) => {
      if (worker_threads && !isInternalWorkerThread) {
        if (!workerThreadService)
          workerThreadService = startWorkerThreadService(worker_threads);
        return workerThreadService.buildSync(options);
      }
      let result;
      runServiceSync((service) => service.buildOrContext({
        callName: "buildSync",
        refs: null,
        options,
        isTTY: isTTY(),
        defaultWD,
        callback: (err, res) => {
          if (err)
            throw err;
          result = res;
        }
      }));
      return result;
    };
    var transformSync = (input, options) => {
      if (worker_threads && !isInternalWorkerThread) {
        if (!workerThreadService)
          workerThreadService = startWorkerThreadService(worker_threads);
        return workerThreadService.transformSync(input, options);
      }
      let result;
      runServiceSync((service) => service.transform({
        callName: "transformSync",
        refs: null,
        input,
        options: options || {},
        isTTY: isTTY(),
        fs: fsSync,
        callback: (err, res) => {
          if (err)
            throw err;
          result = res;
        }
      }));
      return result;
    };
    var formatMessagesSync = (messages, options) => {
      if (worker_threads && !isInternalWorkerThread) {
        if (!workerThreadService)
          workerThreadService = startWorkerThreadService(worker_threads);
        return workerThreadService.formatMessagesSync(messages, options);
      }
      let result;
      runServiceSync((service) => service.formatMessages({
        callName: "formatMessagesSync",
        refs: null,
        messages,
        options,
        callback: (err, res) => {
          if (err)
            throw err;
          result = res;
        }
      }));
      return result;
    };
    var analyzeMetafileSync = (metafile, options) => {
      if (worker_threads && !isInternalWorkerThread) {
        if (!workerThreadService)
          workerThreadService = startWorkerThreadService(worker_threads);
        return workerThreadService.analyzeMetafileSync(metafile, options);
      }
      let result;
      runServiceSync((service) => service.analyzeMetafile({
        callName: "analyzeMetafileSync",
        refs: null,
        metafile: typeof metafile === "string" ? metafile : JSON.stringify(metafile),
        options,
        callback: (err, res) => {
          if (err)
            throw err;
          result = res;
        }
      }));
      return result;
    };
    var stop = () => {
      if (stopService)
        stopService();
      if (workerThreadService)
        workerThreadService.stop();
      return Promise.resolve();
    };
    var initializeWasCalled = false;
    var initialize = (options) => {
      options = validateInitializeOptions(options || {});
      if (options.wasmURL)
        throw new Error(`The "wasmURL" option only works in the browser`);
      if (options.wasmModule)
        throw new Error(`The "wasmModule" option only works in the browser`);
      if (options.worker)
        throw new Error(`The "worker" option only works in the browser`);
      if (initializeWasCalled)
        throw new Error('Cannot call "initialize" more than once');
      ensureServiceIsRunning();
      initializeWasCalled = true;
      return Promise.resolve();
    };
    var defaultWD = process.cwd();
    var longLivedService;
    var stopService;
    var ensureServiceIsRunning = () => {
      if (longLivedService)
        return longLivedService;
      let [command, args] = esbuildCommandAndArgs();
      let child = child_process.spawn(command, args.concat(`--service=${"0.20.2"}`, "--ping"), {
        windowsHide: true,
        stdio: ["pipe", "pipe", "inherit"],
        cwd: defaultWD
      });
      let { readFromStdout, afterClose, service } = createChannel({
        writeToStdin(bytes) {
          child.stdin.write(bytes, (err) => {
            if (err)
              afterClose(err);
          });
        },
        readFileSync: fs22.readFileSync,
        isSync: false,
        hasFS: true,
        esbuild: node_exports
      });
      child.stdin.on("error", afterClose);
      child.on("error", afterClose);
      const stdin = child.stdin;
      const stdout = child.stdout;
      stdout.on("data", readFromStdout);
      stdout.on("end", afterClose);
      stopService = () => {
        stdin.destroy();
        stdout.destroy();
        child.kill();
        initializeWasCalled = false;
        longLivedService = void 0;
        stopService = void 0;
      };
      let refCount = 0;
      child.unref();
      if (stdin.unref) {
        stdin.unref();
      }
      if (stdout.unref) {
        stdout.unref();
      }
      const refs = {
        ref() {
          if (++refCount === 1)
            child.ref();
        },
        unref() {
          if (--refCount === 0)
            child.unref();
        }
      };
      longLivedService = {
        build: (options) => new Promise((resolve2, reject) => {
          service.buildOrContext({
            callName: "build",
            refs,
            options,
            isTTY: isTTY(),
            defaultWD,
            callback: (err, res) => err ? reject(err) : resolve2(res)
          });
        }),
        context: (options) => new Promise((resolve2, reject) => service.buildOrContext({
          callName: "context",
          refs,
          options,
          isTTY: isTTY(),
          defaultWD,
          callback: (err, res) => err ? reject(err) : resolve2(res)
        })),
        transform: (input, options) => new Promise((resolve2, reject) => service.transform({
          callName: "transform",
          refs,
          input,
          options: options || {},
          isTTY: isTTY(),
          fs: fsAsync,
          callback: (err, res) => err ? reject(err) : resolve2(res)
        })),
        formatMessages: (messages, options) => new Promise((resolve2, reject) => service.formatMessages({
          callName: "formatMessages",
          refs,
          messages,
          options,
          callback: (err, res) => err ? reject(err) : resolve2(res)
        })),
        analyzeMetafile: (metafile, options) => new Promise((resolve2, reject) => service.analyzeMetafile({
          callName: "analyzeMetafile",
          refs,
          metafile: typeof metafile === "string" ? metafile : JSON.stringify(metafile),
          options,
          callback: (err, res) => err ? reject(err) : resolve2(res)
        }))
      };
      return longLivedService;
    };
    var runServiceSync = (callback) => {
      let [command, args] = esbuildCommandAndArgs();
      let stdin = new Uint8Array();
      let { readFromStdout, afterClose, service } = createChannel({
        writeToStdin(bytes) {
          if (stdin.length !== 0)
            throw new Error("Must run at most one command");
          stdin = bytes;
        },
        isSync: true,
        hasFS: true,
        esbuild: node_exports
      });
      callback(service);
      let stdout = child_process.execFileSync(command, args.concat(`--service=${"0.20.2"}`), {
        cwd: defaultWD,
        windowsHide: true,
        input: stdin,
        // We don't know how large the output could be. If it's too large, the
        // command will fail with ENOBUFS. Reserve 16mb for now since that feels
        // like it should be enough. Also allow overriding this with an environment
        // variable.
        maxBuffer: +process.env.ESBUILD_MAX_BUFFER || 16 * 1024 * 1024
      });
      readFromStdout(stdout);
      afterClose(null);
    };
    var randomFileName = () => {
      return path22.join(os2.tmpdir(), `esbuild-${crypto.randomBytes(32).toString("hex")}`);
    };
    var workerThreadService = null;
    var startWorkerThreadService = (worker_threads2) => {
      let { port1: mainPort, port2: workerPort } = new worker_threads2.MessageChannel();
      let worker = new worker_threads2.Worker(__filename, {
        workerData: { workerPort, defaultWD, esbuildVersion: "0.20.2" },
        transferList: [workerPort],
        // From node's documentation: https://nodejs.org/api/worker_threads.html
        //
        //   Take care when launching worker threads from preload scripts (scripts loaded
        //   and run using the `-r` command line flag). Unless the `execArgv` option is
        //   explicitly set, new Worker threads automatically inherit the command line flags
        //   from the running process and will preload the same preload scripts as the main
        //   thread. If the preload script unconditionally launches a worker thread, every
        //   thread spawned will spawn another until the application crashes.
        //
        execArgv: []
      });
      let nextID = 0;
      let fakeBuildError = (text) => {
        let error = new Error(`Build failed with 1 error:
error: ${text}`);
        let errors = [{ id: "", pluginName: "", text, location: null, notes: [], detail: void 0 }];
        error.errors = errors;
        error.warnings = [];
        return error;
      };
      let validateBuildSyncOptions = (options) => {
        if (!options)
          return;
        let plugins = options.plugins;
        if (plugins && plugins.length > 0)
          throw fakeBuildError(`Cannot use plugins in synchronous API calls`);
      };
      let applyProperties = (object, properties) => {
        for (let key in properties) {
          object[key] = properties[key];
        }
      };
      let runCallSync = (command, args) => {
        let id = nextID++;
        let sharedBuffer = new SharedArrayBuffer(8);
        let sharedBufferView = new Int32Array(sharedBuffer);
        let msg = { sharedBuffer, id, command, args };
        worker.postMessage(msg);
        let status = Atomics.wait(sharedBufferView, 0, 0);
        if (status !== "ok" && status !== "not-equal")
          throw new Error("Internal error: Atomics.wait() failed: " + status);
        let { message: { id: id2, resolve: resolve2, reject, properties } } = worker_threads2.receiveMessageOnPort(mainPort);
        if (id !== id2)
          throw new Error(`Internal error: Expected id ${id} but got id ${id2}`);
        if (reject) {
          applyProperties(reject, properties);
          throw reject;
        }
        return resolve2;
      };
      worker.unref();
      return {
        buildSync(options) {
          validateBuildSyncOptions(options);
          return runCallSync("build", [options]);
        },
        transformSync(input, options) {
          return runCallSync("transform", [input, options]);
        },
        formatMessagesSync(messages, options) {
          return runCallSync("formatMessages", [messages, options]);
        },
        analyzeMetafileSync(metafile, options) {
          return runCallSync("analyzeMetafile", [metafile, options]);
        },
        stop() {
          worker.terminate();
          workerThreadService = null;
        }
      };
    };
    var startSyncServiceWorker = () => {
      let workerPort = worker_threads.workerData.workerPort;
      let parentPort = worker_threads.parentPort;
      let extractProperties = (object) => {
        let properties = {};
        if (object && typeof object === "object") {
          for (let key in object) {
            properties[key] = object[key];
          }
        }
        return properties;
      };
      try {
        let service = ensureServiceIsRunning();
        defaultWD = worker_threads.workerData.defaultWD;
        parentPort.on("message", (msg) => {
          (async () => {
            let { sharedBuffer, id, command, args } = msg;
            let sharedBufferView = new Int32Array(sharedBuffer);
            try {
              switch (command) {
                case "build":
                  workerPort.postMessage({ id, resolve: await service.build(args[0]) });
                  break;
                case "transform":
                  workerPort.postMessage({ id, resolve: await service.transform(args[0], args[1]) });
                  break;
                case "formatMessages":
                  workerPort.postMessage({ id, resolve: await service.formatMessages(args[0], args[1]) });
                  break;
                case "analyzeMetafile":
                  workerPort.postMessage({ id, resolve: await service.analyzeMetafile(args[0], args[1]) });
                  break;
                default:
                  throw new Error(`Invalid command: ${command}`);
              }
            } catch (reject) {
              workerPort.postMessage({ id, reject, properties: extractProperties(reject) });
            }
            Atomics.add(sharedBufferView, 0, 1);
            Atomics.notify(sharedBufferView, 0, Infinity);
          })();
        });
      } catch (reject) {
        parentPort.on("message", (msg) => {
          let { sharedBuffer, id } = msg;
          let sharedBufferView = new Int32Array(sharedBuffer);
          workerPort.postMessage({ id, reject, properties: extractProperties(reject) });
          Atomics.add(sharedBufferView, 0, 1);
          Atomics.notify(sharedBufferView, 0, Infinity);
        });
      }
    };
    if (isInternalWorkerThread) {
      startSyncServiceWorker();
    }
    var node_default = node_exports;
  }
});

// index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execSync as execSync2 } from "child_process";
import { existsSync as existsSync3 } from "fs";

// auth.ts
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
var AUTH_FILE = path.join(
  process.env.HOME || process.env.USERPROFILE || "",
  ".claude",
  "mcp-inflight-auth.json"
);
var AUTH_ENVIRONMENTS = {
  local: { inflightUrl: "http://localhost:5173" },
  staging: { inflightUrl: "https://staging.inflight.co" },
  production: { inflightUrl: "https://inflight.co" }
};
var AUTH_ENV = process.env.INFLIGHT_ENV || "production";
var INFLIGHT_BASE = process.env.INFLIGHT_URL || AUTH_ENVIRONMENTS[AUTH_ENV].inflightUrl;
function getAuthData() {
  try {
    const content = fs.readFileSync(AUTH_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function saveAuthData(data) {
  const dir = path.dirname(AUTH_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), { mode: 384 });
}
function clearAuthData() {
  try {
    fs.unlinkSync(AUTH_FILE);
  } catch {
  }
}
function isAuthenticated() {
  return getAuthData() !== null;
}
async function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === "darwin") {
      await execAsync(`open "${url}"`);
    } else if (platform === "win32") {
      await execAsync(`start "" "${url}"`);
    } else {
      await execAsync(`xdg-open "${url}"`);
    }
  } catch (error) {
    throw new Error(`Failed to open browser. Please manually visit: ${url}`);
  }
}
async function authenticate(log2) {
  return new Promise((resolve2, reject) => {
    const server2 = http.createServer((req, res) => {
      const url = new URL(req.url || "", `http://localhost`);
      if (url.pathname === "/callback") {
        const apiKey = url.searchParams.get("api_key");
        const userId = url.searchParams.get("user_id");
        const email = url.searchParams.get("email");
        const name = url.searchParams.get("name");
        if (!apiKey || !userId) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`
            <html>
              <body style="font-family: system-ui; padding: 2rem; text-align: center;">
                <h1 style="color: #e53e3e;">Authentication Failed</h1>
                <p>Missing API key or user ID. Please try again.</p>
              </body>
            </html>
          `);
          server2.close();
          reject(new Error("Missing API key or user ID in callback"));
          return;
        }
        const displayName = name || email || "there";
        const safeDisplayName = escapeHtml(displayName);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>Authenticated - Inflight</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  background-color: #15161C;
                  color: #F9FAFB;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                }
                .container {
                  background-color: #0F1012;
                  border: 1px solid #1F2025;
                  border-radius: 16px;
                  padding: 48px;
                  text-align: center;
                  max-width: 400px;
                  width: 90%;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
                }
                .logo {
                  margin-bottom: 32px;
                }
                .success-icon {
                  width: 64px;
                  height: 64px;
                  background: linear-gradient(135deg, #1C8AF8 0%, #60ADFA 100%);
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 24px;
                }
                .success-icon svg {
                  width: 32px;
                  height: 32px;
                }
                h1 {
                  font-size: 24px;
                  font-weight: 600;
                  margin-bottom: 8px;
                  color: #F9FAFB;
                }
                .greeting {
                  font-size: 16px;
                  color: #98A1AE;
                  margin-bottom: 24px;
                }
                .message {
                  font-size: 14px;
                  color: #697282;
                  line-height: 1.5;
                }
                .close-hint {
                  margin-top: 24px;
                  padding-top: 24px;
                  border-top: 1px solid #1F2025;
                  font-size: 13px;
                  color: #697282;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="logo">
                  <svg xmlns="http://www.w3.org/2000/svg" width="41" height="25" viewBox="0 0 41 25" fill="none">
                    <path d="M23.1244 23.6849C22.6097 24.7058 21.0702 24.3421 21.0668 23.1988L21.0015 1.1163C20.9987 0.188062 22.0857 -0.316302 22.7927 0.285127L39.6536 14.6273C40.526 15.3694 39.8055 16.782 38.6925 16.5114L28.8843 14.127C28.3931 14.0076 27.8845 14.2426 27.6569 14.6939L23.1244 23.6849Z" fill="white"/>
                    <path d="M16.9597 23.6651C17.4771 24.6846 19.0157 24.3168 19.016 23.1735L19.0223 1.09085C19.0225 0.162606 17.9342 -0.338848 17.2288 0.26447L0.406372 14.6517C-0.464095 15.3961 0.260202 16.8068 1.37245 16.5333L11.1743 14.1226C11.6651 14.0019 12.1744 14.2355 12.4032 14.6862L16.9597 23.6651Z" fill="white"/>
                  </svg>
                </div>
                <div class="success-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h1>You're connected!</h1>
                <p class="greeting">Welcome, ${safeDisplayName}</p>
                <p class="message">You can close this tab and head back to your terminal.</p>
                <p class="close-hint">Closing automatically...</p>
              </div>
              <script>setTimeout(() => window.close(), 3000);</script>
            </body>
          </html>
        `);
        const authData = {
          apiKey,
          userId,
          email: email || void 0,
          name: name || void 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        saveAuthData(authData);
        server2.close();
        resolve2(authData);
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
    server2.on("error", (err) => {
      reject(new Error(`Failed to start auth server: ${err.message}`));
    });
    server2.listen(0, "127.0.0.1", async () => {
      const address = server2.address();
      if (!address || typeof address === "string") {
        server2.close();
        reject(new Error("Failed to get server address"));
        return;
      }
      const port = address.port;
      const authUrl = `${INFLIGHT_BASE}/mcp/auth?callback_port=${port}`;
      log2(`Signing in \u2014 opening browser...`);
      try {
        await openBrowser(authUrl);
      } catch (error) {
        log2(`Couldn't open browser. Visit this link to sign in: ${authUrl}`);
      }
    });
    const timeout = setTimeout(() => {
      server2.close();
      reject(new Error("Authentication timed out after 5 minutes"));
    }, 3e5);
    server2.on("close", () => {
      clearTimeout(timeout);
    });
  });
}

// analyzers/dependency-analyzer.ts
import * as path2 from "path";
import * as fs2 from "fs";

// utils/git-utils.ts
import { execSync, execFileSync } from "child_process";
function gitExec(command, cwd) {
  try {
    return execSync(command, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"]
    }).trim();
  } catch {
    return null;
  }
}
function isGitRepo(projectPath) {
  const result = gitExec("git rev-parse --is-inside-work-tree", projectPath);
  return result === "true";
}
function getDefaultBranch(projectPath) {
  if (!isGitRepo(projectPath)) {
    return null;
  }
  const branches = ["main", "master"];
  for (const branch of branches) {
    const result = gitExec(`git rev-parse --verify ${branch}`, projectPath);
    if (result !== null) {
      return branch;
    }
  }
  const originHead = gitExec(
    "git symbolic-ref refs/remotes/origin/HEAD",
    projectPath
  );
  if (originHead) {
    return originHead.replace("refs/remotes/origin/", "");
  }
  return null;
}
function getGitDiff(projectPath, maxBytes = 5e4, baseBranch) {
  if (!isGitRepo(projectPath)) {
    return null;
  }
  const defaultBranch = baseBranch || getDefaultBranch(projectPath);
  if (!defaultBranch) {
    return null;
  }
  const currentBranch = gitExec("git rev-parse --abbrev-ref HEAD", projectPath);
  if (!currentBranch || currentBranch === defaultBranch) {
    return null;
  }
  const mergeBase = gitExec(
    `git merge-base ${defaultBranch} HEAD`,
    projectPath
  );
  if (!mergeBase) {
    return null;
  }
  const diffStat = gitExec(`git diff --stat ${mergeBase}...HEAD`, projectPath) || "";
  const diff = gitExec(`git diff ${mergeBase}...HEAD`, projectPath);
  if (!diff || diff.length === 0) {
    return null;
  }
  const isTruncated = diff.length > maxBytes;
  const truncatedDiff = isTruncated ? diff.substring(0, maxBytes) + "\n... (truncated)" : diff;
  return {
    baseBranch: defaultBranch,
    currentBranch,
    mergeBase: mergeBase.substring(0, 7),
    diff: truncatedDiff,
    diffStat,
    isTruncated,
    totalBytes: diff.length
  };
}

// analyzers/dependency-analyzer.ts
var UI_RELEVANT_PATTERNS = [
  /\.(tsx|jsx)$/,
  // React components (.tsx/.jsx)
  /(^|\/)components\//,
  // Component directories
  /(^|\/)app\/.*\.(js|jsx|ts|tsx)$/,
  // Next.js app router (any JS/TS file)
  /(^|\/)pages\/.*\.(js|jsx|ts|tsx)$/,
  // Next.js pages router (any JS/TS file)
  /\.(css|scss|sass|module\.css)$/
  // Stylesheets
];
function isUIRelevant(filePath) {
  return UI_RELEVANT_PATTERNS.some((pattern) => pattern.test(filePath));
}
function parseChangedFilesFromDiff(diff) {
  const files = [];
  const lines = diff.split("\n");
  for (const line of lines) {
    const diffMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (diffMatch) {
      const filePath = diffMatch[2];
      const changeType = "modified";
      files.push({
        path: filePath,
        changeType,
        isUIRelevant: isUIRelevant(filePath)
      });
    }
  }
  return files;
}
function loadPathAliases(projectRoot) {
  const tsconfigPaths = [
    path2.join(projectRoot, "tsconfig.json"),
    path2.join(projectRoot, "jsconfig.json")
  ];
  for (const tsconfigPath of tsconfigPaths) {
    if (fs2.existsSync(tsconfigPath)) {
      try {
        const content = fs2.readFileSync(tsconfigPath, "utf-8");
        let tsconfig;
        try {
          tsconfig = JSON.parse(content);
        } catch {
          const cleanContent = content.split("\n").map((line) => line.replace(/^\s*\/\/.*$/, "")).join("\n");
          tsconfig = JSON.parse(cleanContent);
        }
        const paths = tsconfig.compilerOptions?.paths || {};
        const aliases = {};
        for (const [alias, targets] of Object.entries(paths)) {
          const cleanAlias = alias.replace("/*", "/");
          const cleanTarget = (targets[0] || "").replace(
            "/*",
            "/"
          );
          if (cleanTarget) {
            aliases[cleanAlias] = cleanTarget;
          }
        }
        return aliases;
      } catch {
      }
    }
  }
  return {};
}
function createAnalysisPlugin(projectRoot, pathAliases, resolvedFiles, npmPackages, workspacePackages) {
  return {
    name: "dependency-analyzer",
    setup(build) {
      for (const [alias, target] of Object.entries(pathAliases)) {
        const filter = new RegExp(`^${alias.replace("/", "\\/")}`);
        build.onResolve({ filter }, (args) => {
          const resolvedPath = args.path.replace(alias, target);
          const fullPath = path2.resolve(projectRoot, resolvedPath);
          const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
          for (const ext of extensions) {
            const testPath = fullPath + ext;
            if (fs2.existsSync(testPath)) {
              const relativePath = path2.relative(projectRoot, testPath);
              resolvedFiles.add(relativePath);
              return { path: testPath };
            }
            const indexPath = path2.join(fullPath, `index${ext || ".ts"}`);
            if (fs2.existsSync(indexPath)) {
              const relativePath = path2.relative(projectRoot, indexPath);
              resolvedFiles.add(relativePath);
              return { path: indexPath };
            }
          }
          return { path: args.path, external: true };
        });
      }
      build.onResolve({ filter: /^@[^/]+\// }, (args) => {
        const packageName = args.path.split("/").slice(0, 2).join("/");
        const workspacePaths = [
          path2.join(projectRoot, "..", "packages"),
          path2.join(projectRoot, "..", "..", "packages"),
          path2.join(projectRoot, "packages")
        ];
        for (const wsPath of workspacePaths) {
          const pkgName = packageName.split("/")[1];
          const pkgPath = path2.join(wsPath, pkgName);
          if (fs2.existsSync(pkgPath)) {
            const existing2 = workspacePackages.get(packageName) || {
              resolvedPath: path2.relative(projectRoot, pkgPath),
              imports: /* @__PURE__ */ new Set()
            };
            existing2.imports.add(args.path);
            workspacePackages.set(packageName, existing2);
            return { path: args.path, external: true };
          }
        }
        const existing = npmPackages.get(packageName) || /* @__PURE__ */ new Set();
        const subpath = args.path.slice(packageName.length + 1);
        existing.add(subpath || "default");
        npmPackages.set(packageName, existing);
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^[^.@/]/ }, (args) => {
        const packageName = args.path.split("/")[0];
        const existing = npmPackages.get(packageName) || /* @__PURE__ */ new Set();
        const subpath = args.path.slice(packageName.length + 1);
        existing.add(subpath || "default");
        npmPackages.set(packageName, existing);
        return { path: args.path, external: true };
      });
      build.onResolve({ filter: /^\./ }, (args) => {
        const resolvedPath = path2.resolve(
          path2.dirname(args.importer),
          args.path
        );
        const extensions = [".ts", ".tsx", ".js", ".jsx", ""];
        for (const ext of extensions) {
          const testPath = resolvedPath + ext;
          if (fs2.existsSync(testPath)) {
            const relativePath = path2.relative(projectRoot, testPath);
            resolvedFiles.add(relativePath);
            return { path: testPath };
          }
          const indexPath = path2.join(resolvedPath, `index${ext || ".ts"}`);
          if (fs2.existsSync(indexPath)) {
            const relativePath = path2.relative(projectRoot, indexPath);
            resolvedFiles.add(relativePath);
            return { path: indexPath };
          }
        }
        return { path: args.path, external: true };
      });
      build.onLoad(
        { filter: /\.(ts|tsx|js|jsx)$/ },
        async (args) => {
          const relativePath = path2.relative(projectRoot, args.path);
          resolvedFiles.add(relativePath);
          const content = await fs2.promises.readFile(args.path, "utf-8");
          return {
            contents: content,
            loader: args.path.endsWith(".tsx") ? "tsx" : args.path.endsWith(".ts") ? "ts" : args.path.endsWith(".jsx") ? "jsx" : "js"
          };
        }
      );
    }
  };
}
async function analyzeDependencies(projectRoot, entryPoints, pathAliases) {
  const resolvedFiles = /* @__PURE__ */ new Set();
  const npmPackages = /* @__PURE__ */ new Map();
  const workspacePackages = /* @__PURE__ */ new Map();
  for (const entry of entryPoints) {
    resolvedFiles.add(entry);
  }
  const absoluteEntryPoints = entryPoints.map(
    (e) => path2.resolve(projectRoot, e)
  );
  let esbuild;
  try {
    esbuild = await Promise.resolve().then(() => __toESM(require_main(), 1));
  } catch {
    throw new Error("esbuild is not installed. Install it with: npm install esbuild");
  }
  try {
    await esbuild.build({
      entryPoints: absoluteEntryPoints,
      bundle: true,
      write: false,
      platform: "browser",
      format: "esm",
      logLevel: "silent",
      plugins: [
        createAnalysisPlugin(
          projectRoot,
          pathAliases,
          resolvedFiles,
          npmPackages,
          workspacePackages
        )
      ]
    });
  } catch {
  }
  return {
    localFiles: Array.from(resolvedFiles).sort(),
    npmPackages: Array.from(npmPackages.entries()).map(([name, specifiers]) => ({
      name,
      specifiers: Array.from(specifiers)
    })),
    workspacePackages: Array.from(workspacePackages.entries()).map(
      ([name, data]) => ({
        name,
        resolvedPath: data.resolvedPath,
        importedFiles: Array.from(data.imports)
      })
    )
  };
}
async function analyzeProjectDependencies(projectPath, changedFiles, baseBranch) {
  const startTime = Date.now();
  const projectRoot = path2.resolve(projectPath);
  const pathAliases = loadPathAliases(projectRoot);
  let files;
  if (changedFiles && changedFiles.length > 0) {
    files = changedFiles.map((f) => ({
      path: f,
      changeType: "modified",
      isUIRelevant: isUIRelevant(f)
    }));
  } else if (isGitRepo(projectRoot)) {
    const diffResult = getGitDiff(projectRoot, 5e5, baseBranch);
    if (diffResult) {
      files = parseChangedFilesFromDiff(diffResult.diff);
    } else {
      files = [];
    }
  } else {
    files = [];
  }
  const entryPoints = files.filter((f) => f.isUIRelevant && f.changeType !== "deleted").map((f) => f.path);
  if (entryPoints.length === 0) {
    return {
      changedFiles: files,
      dependencies: {
        localFiles: [],
        npmPackages: [],
        workspacePackages: []
      },
      metadata: {
        projectRoot,
        entryPoints: [],
        analysisTimeMs: Date.now() - startTime,
        pathAliases
      }
    };
  }
  const dependencies = await analyzeDependencies(
    projectRoot,
    entryPoints,
    pathAliases
  );
  return {
    changedFiles: files,
    dependencies,
    metadata: {
      projectRoot,
      entryPoints,
      analysisTimeMs: Date.now() - startTime,
      pathAliases
    }
  };
}

// utils/file-utils.ts
import * as fs3 from "fs";
import * as path3 from "path";
var BINARY_EXTENSIONS = [
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".bmp",
  ".tiff",
  ".avif",
  ".heic",
  ".heif",
  // Fonts
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  // Audio/Video
  ".mp3",
  ".mp4",
  ".webm",
  ".ogg",
  ".wav",
  ".m4a",
  ".flac",
  ".avi",
  ".mov",
  ".mkv",
  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // Archives
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".7z",
  ".rar",
  // Other binary
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".db",
  ".sqlite",
  ".sqlite3",
  ".wasm",
  // Lock files that might be binary
  ".lockb"
];
function isBinaryFile(filename) {
  const ext = path3.extname(filename).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext);
}
function containsBinaryContent(buffer) {
  const sampleSize = Math.min(buffer.length, 8192);
  let nonPrintable = 0;
  for (let i = 0; i < sampleSize; i++) {
    const byte = buffer[i];
    if (byte === 0) {
      return true;
    }
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      nonPrintable++;
    }
  }
  return nonPrintable / sampleSize > 0.1;
}
function getFileContent(file) {
  return typeof file === "string" ? file : file.content;
}
function getFileSize(file) {
  return getFileContent(file).length;
}
var EXCLUDE_PATTERNS = [
  // Version control - match .git file (worktrees) or .git directory
  /^\.git$/,
  /(^|\/)\.git\//,
  // Dependencies
  /(^|\/)node_modules\//,
  // Build outputs
  /(^|\/)\.next\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)out\//,
  /(^|\/)\.output\//,
  /(^|\/)\.svelte-kit\//,
  // Cache directories
  /(^|\/)\.vercel\//,
  /(^|\/)\.turbo\//,
  /(^|\/)\.cache\//,
  /(^|\/)\.parcel-cache\//,
  /(^|\/)\.vite\//,
  /(^|\/)\.nuxt\//,
  /(^|\/)\.expo\//,
  // Lock files
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /bun\.lockb$/,
  // OS/editor files
  /\.DS_Store$/,
  /\.log$/,
  /Thumbs\.db$/,
  // Coverage
  /(^|\/)coverage\//,
  /(^|\/)\.nyc_output\//
];
var ENV_PATTERNS = [/^\.env/, /\.env\./];
function shouldExclude(filePath) {
  if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(filePath))) {
    return true;
  }
  const fileName = filePath.split("/").pop() || "";
  if (ENV_PATTERNS.some((pattern) => pattern.test(fileName))) {
    return true;
  }
  return false;
}
function readProjectFiles(rootDir, debug = false) {
  const files = {};
  let binaryCount = 0;
  let textCount = 0;
  function walkDir(dir) {
    let entries;
    try {
      entries = fs3.readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path3.join(dir, entry);
      const relativePath = path3.relative(rootDir, fullPath);
      if (shouldExclude(relativePath))
        continue;
      let stat;
      try {
        stat = fs3.statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (stat.isFile()) {
        try {
          const buffer = fs3.readFileSync(fullPath);
          const isBinaryByExt = isBinaryFile(entry);
          const isBinaryByContent = !isBinaryByExt && containsBinaryContent(buffer);
          const treatAsBinary = isBinaryByExt || isBinaryByContent;
          if (treatAsBinary) {
            const content = buffer.toString("base64");
            files[relativePath] = { content, encoding: "base64" };
            binaryCount++;
            if (debug && isBinaryByContent && !isBinaryByExt) {
              console.error(`[file-utils] Detected binary by content: ${relativePath}`);
            }
          } else {
            const content = buffer.toString("utf-8");
            files[relativePath] = content;
            textCount++;
          }
        } catch (err) {
          if (debug) {
            console.error(`[file-utils] Failed to read: ${relativePath}`, err);
          }
        }
      }
    }
  }
  walkDir(rootDir);
  if (debug) {
    console.error(`[file-utils] Read ${textCount} text files, ${binaryCount} binary files`);
  }
  return files;
}
var MAX_CHUNK_SIZE = 2 * 1024 * 1024;
var CHUNK_THRESHOLD = 3 * 1024 * 1024;
function calculateTotalSize(files) {
  return Object.values(files).reduce((sum, file) => sum + getFileSize(file), 0);
}
function needsChunkedUpload(files) {
  return calculateTotalSize(files) > CHUNK_THRESHOLD;
}
function chunkFiles(files, maxChunkSize = MAX_CHUNK_SIZE) {
  const chunks = [];
  let currentChunk = {};
  let currentSize = 0;
  const entries = Object.entries(files).sort(
    (a, b) => getFileSize(a[1]) - getFileSize(b[1])
  );
  for (const [filePath, file] of entries) {
    const fileSize = getFileSize(file);
    if (fileSize > maxChunkSize) {
      if (Object.keys(currentChunk).length > 0) {
        chunks.push(currentChunk);
        currentChunk = {};
        currentSize = 0;
      }
      chunks.push({ [filePath]: file });
      continue;
    }
    if (currentSize + fileSize > maxChunkSize && Object.keys(currentChunk).length > 0) {
      chunks.push(currentChunk);
      currentChunk = {};
      currentSize = 0;
    }
    currentChunk[filePath] = file;
    currentSize += fileSize;
  }
  if (Object.keys(currentChunk).length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}
function getChunkStats(chunks) {
  const chunkSizes = chunks.map((chunk) => calculateTotalSize(chunk));
  const totalFiles = chunks.reduce(
    (sum, chunk) => sum + Object.keys(chunk).length,
    0
  );
  const totalSize = chunkSizes.reduce((sum, size) => sum + size, 0);
  return {
    totalChunks: chunks.length,
    chunkSizes,
    totalFiles,
    totalSize
  };
}
var ESSENTIAL_CONFIG_FILES = [
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
  "tailwind.config.mjs",
  "postcss.config.js",
  "postcss.config.mjs",
  "postcss.config.cjs",
  ".prettierrc",
  ".prettierrc.json",
  ".eslintrc.json",
  "eslint.config.js",
  "index.html"
];
function readSpecificFiles(rootDir, filePaths, includeEssentials = true, debug = false) {
  const files = {};
  let binaryCount = 0;
  let textCount = 0;
  let notFoundCount = 0;
  const pathsToRead = new Set(filePaths);
  if (includeEssentials) {
    for (const configFile of ESSENTIAL_CONFIG_FILES) {
      const fullPath = path3.join(rootDir, configFile);
      if (fs3.existsSync(fullPath)) {
        pathsToRead.add(configFile);
      }
    }
  }
  for (const relativePath of pathsToRead) {
    if (shouldExclude(relativePath)) {
      if (debug) {
        console.error(`[file-utils] Excluded: ${relativePath}`);
      }
      continue;
    }
    const fullPath = path3.join(rootDir, relativePath);
    try {
      const stat = fs3.statSync(fullPath);
      if (!stat.isFile()) {
        if (debug) {
          console.error(`[file-utils] Not a file: ${relativePath}`);
        }
        continue;
      }
      const buffer = fs3.readFileSync(fullPath);
      const fileName = path3.basename(relativePath);
      const isBinaryByExt = isBinaryFile(fileName);
      const isBinaryByContent = !isBinaryByExt && containsBinaryContent(buffer);
      const treatAsBinary = isBinaryByExt || isBinaryByContent;
      if (treatAsBinary) {
        const content = buffer.toString("base64");
        files[relativePath] = { content, encoding: "base64" };
        binaryCount++;
        if (debug && isBinaryByContent && !isBinaryByExt) {
          console.error(`[file-utils] Detected binary by content: ${relativePath}`);
        }
      } else {
        const content = buffer.toString("utf-8");
        files[relativePath] = content;
        textCount++;
      }
    } catch (err) {
      notFoundCount++;
      if (debug) {
        console.error(`[file-utils] Failed to read: ${relativePath}`, err);
      }
    }
  }
  if (debug) {
    console.error(
      `[file-utils] Read ${textCount} text, ${binaryCount} binary, ${notFoundCount} not found`
    );
  }
  return files;
}

// utils/progress-messages.ts
var CONTENT_MATCHERS = [
  // Local prep phase
  { pattern: /Starting share for/i, message: "Preparing your project..." },
  { pattern: /Checking Share API/i, message: "Preparing your project..." },
  { pattern: /Share API is healthy/i, message: "Preparing your project..." },
  { pattern: /Getting git info/i, message: "Loading your code..." },
  { pattern: /Reading project files|Reading all project/i, message: "Loading your code..." },
  { pattern: /Analyzing dependencies/i, message: "Loading your code..." },
  { pattern: /Reading.*analyzed files/i, message: "Loading your code..." },
  { pattern: /Authenticating with InFlight/i, message: "Loading your code..." },
  { pattern: /Starting share on server/i, message: "Uploading your project..." },
  // Chunked upload phase
  { pattern: /Large project.*chunked/i, message: "Uploading your project..." },
  { pattern: /Splitting into.*chunks/i, message: "Uploading your project..." },
  { pattern: /Initializing chunked/i, message: "Uploading your project..." },
  { pattern: /Uploading chunk/i, message: "Uploading your project..." },
  { pattern: /Finalizing upload/i, message: "Upload complete, starting analysis..." },
  // Server sandbox & upload phase
  { pattern: /Validating workspace/i, message: "Setting things up..." },
  { pattern: /Creating sandbox/i, message: "Setting things up..." },
  { pattern: /Uploading.*files/i, message: "Uploading your project..." },
  { pattern: /Writing git diff/i, message: "Preparing your changes for review..." },
  { pattern: /Preparing analysis/i, message: "Getting ready to analyze..." },
  // Claude installation & analysis phase
  { pattern: /Checking Claude|Installing Claude/i, message: "Getting ready to analyze..." },
  { pattern: /Setting up.*user|non-root/i, message: "Getting ready to analyze..." },
  { pattern: /Starting Claude/i, message: "Running a detailed analysis of your changes..." },
  { pattern: /Claude is analyzing/i, message: "Analyzing your changes..." },
  { pattern: /Claude is working/i, message: "Still analyzing..." },
  { pattern: /^Claude:/i, message: "Analyzing your changes..." },
  { pattern: /Analyzing\.\.\. \(\d+s\)/i, message: "Still analyzing..." },
  { pattern: /Claude finished/i, message: "Analysis complete! Building your preview..." },
  // Prototype found
  { pattern: /Prototype ready|Prototype found/i, message: "Analysis complete! Building your preview..." },
  // Deploy phase
  { pattern: /Configuring preview/i, message: "Building your preview..." },
  { pattern: /Installing dependencies/i, message: "Installing dependencies..." },
  { pattern: /Starting dev server/i, message: "Starting your preview..." },
  { pattern: /Waiting for server/i, message: "Starting your preview..." },
  { pattern: /Setting up preview tunnel/i, message: "Setting up your preview link..." },
  { pattern: /Preview tunnel ready/i, message: "Preview link is ready!" },
  { pattern: /Waiting for Vite/i, message: "Almost there..." },
  { pattern: /Preview ready/i, message: "Preview is live!" },
  { pattern: /Preview may still be compiling/i, message: "Almost there..." },
  // Finalization
  { pattern: /Creating InFlight version/i, message: "Creating your InFlight version..." },
  { pattern: /Tracking sandbox/i, message: "Saving your share..." },
  { pattern: /Generating diff summary/i, message: "Summarizing your changes..." },
  { pattern: /Generating review/i, message: "Preparing feedback questions..." },
  { pattern: /^Complete!$/i, message: "All done!" },
  { pattern: /Share complete/i, message: "All done!" },
  // Clone-specific messages
  { pattern: /Checking repository access/i, message: "Checking repository access..." },
  { pattern: /Cloning repository/i, message: "Cloning your repository..." },
  { pattern: /Setting up project files/i, message: "Setting up your project..." },
  { pattern: /Git clone available/i, message: "Found a faster way to load your project!" }
];
var PHASE_MESSAGES = [
  { maxPct: 5, message: "Preparing your project..." },
  { maxPct: 12, message: "Loading your code..." },
  { maxPct: 42, message: "Uploading your project..." },
  { maxPct: 50, message: "Setting things up..." },
  { maxPct: 55, message: "Getting ready to analyze..." },
  { maxPct: 70, message: "Analyzing your changes..." },
  { maxPct: 80, message: "Building your preview..." },
  { maxPct: 90, message: "Setting up your preview link..." },
  { maxPct: 96, message: "Creating your InFlight version..." },
  { maxPct: 100, message: "Wrapping up..." }
];
var lastFriendlyMessage = "";
function toFriendlyMessage(percentage, rawMessage) {
  let friendly;
  for (const matcher of CONTENT_MATCHERS) {
    if (matcher.pattern.test(rawMessage)) {
      friendly = matcher.message;
      break;
    }
  }
  if (!friendly) {
    for (const phase of PHASE_MESSAGES) {
      if (percentage <= phase.maxPct) {
        friendly = phase.message;
        break;
      }
    }
  }
  friendly = friendly || "Working on it...";
  if (friendly === lastFriendlyMessage) {
    return null;
  }
  lastFriendlyMessage = friendly;
  return friendly;
}
function resetMessageState() {
  lastFriendlyMessage = "";
}

// index.ts
var ENVIRONMENTS = {
  local: { shareApi: "http://localhost:3002" },
  staging: { shareApi: "https://share-api-staging-2762.up.railway.app" },
  production: { shareApi: "https://share-api.inflight.co" }
};
var ENV = process.env.INFLIGHT_ENV || "production";
var SHARE_API_URL = process.env.SHARE_API_URL || ENVIRONMENTS[ENV].shareApi;
function openInBrowser(url) {
  try {
    const platform = process.platform;
    let cmd;
    if (platform === "darwin") {
      cmd = `open "${url}"`;
    } else if (platform === "win32") {
      cmd = `start "" "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }
    execSync2(cmd, { stdio: "ignore" });
  } catch {
  }
}
function getGitInfo(dir) {
  try {
    execSync2("git rev-parse --git-dir", { cwd: dir, stdio: "pipe" });
  } catch {
    return { isGitRepo: false };
  }
  try {
    const currentBranch = execSync2("git branch --show-current", { cwd: dir, encoding: "utf-8" }).trim();
    let gitUrl;
    try {
      gitUrl = execSync2("git remote get-url origin", { cwd: dir, encoding: "utf-8" }).trim();
    } catch {
    }
    let baseBranch = "main";
    try {
      execSync2("git show-ref --verify --quiet refs/heads/main", { cwd: dir, stdio: "pipe" });
    } catch {
      try {
        execSync2("git show-ref --verify --quiet refs/heads/master", { cwd: dir, stdio: "pipe" });
        baseBranch = "master";
      } catch {
      }
    }
    let diff = "";
    let diffStat = "";
    const diffTargets = [
      `${baseBranch}...HEAD`,
      `origin/${baseBranch}...HEAD`,
      "HEAD"
    ];
    for (const target of diffTargets) {
      try {
        const cmd = target === "HEAD" ? "git diff HEAD" : `git diff ${target}`;
        diff = execSync2(cmd, { cwd: dir, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
        diffStat = execSync2(`${cmd} --stat`, { cwd: dir, encoding: "utf-8" });
        if (diff)
          break;
      } catch {
        continue;
      }
    }
    let branchExistsOnRemote = false;
    try {
      const lsRemoteOutput = execSync2(`git ls-remote --heads origin ${currentBranch}`, { cwd: dir, encoding: "utf-8" }).trim();
      branchExistsOnRemote = lsRemoteOutput.length > 0;
    } catch {
      branchExistsOnRemote = false;
    }
    return {
      isGitRepo: true,
      currentBranch,
      baseBranch,
      gitUrl,
      diff,
      diffStat,
      branchExistsOnRemote
    };
  } catch {
    return { isGitRepo: true };
  }
}
async function shareApiHealthCheck() {
  try {
    const response = await fetch(`${SHARE_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
var server = new McpServer(
  {
    name: "inflight-local",
    version: "1.0.0"
  },
  {
    capabilities: {
      logging: {},
      // Enable logging capability for sendLoggingMessage
      prompts: {}
      // Enable prompts (slash commands)
    }
  }
);
async function log(message, level = "info") {
  console.error(`[Inflight] ${message}`);
  try {
    await server.server.sendLoggingMessage({
      level,
      data: message,
      logger: "inflight-local"
    });
  } catch {
  }
}
server.tool(
  "auth_status",
  "Check if you're signed in to Inflight",
  {},
  async () => {
    const authData = getAuthData();
    if (authData) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            authenticated: true,
            userId: authData.userId,
            email: authData.email,
            name: authData.name,
            createdAt: authData.createdAt
          }, null, 2)
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ authenticated: false }, null, 2)
      }]
    };
  }
);
server.tool(
  "inflight_login",
  "Sign in to Inflight. Opens a browser window to log in.",
  {
    force: z.boolean().optional().describe("Force re-authentication even if already logged in")
  },
  async (args) => {
    const existingAuth = getAuthData();
    if (existingAuth && !args.force) {
      console.error(`[Local MCP] Already authenticated as ${existingAuth.email || existingAuth.userId}`);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: `Already authenticated as ${existingAuth.email || existingAuth.name || existingAuth.userId}`,
            userId: existingAuth.userId,
            email: existingAuth.email,
            alreadyLoggedIn: true
          }, null, 2)
        }]
      };
    }
    console.error(`[Local MCP] Starting authentication flow...`);
    try {
      const authData = await authenticate((msg) => console.error(`[Local MCP] ${msg}`));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            message: `Authenticated as ${authData.email || authData.name || authData.userId}`,
            userId: authData.userId,
            email: authData.email
          }, null, 2)
        }]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: "text", text: `Authentication failed: ${message}` }],
        isError: true
      };
    }
  }
);
server.tool(
  "inflight_logout",
  "Sign out of Inflight",
  {},
  async () => {
    const wasAuthenticated = isAuthenticated();
    clearAuthData();
    return {
      content: [{
        type: "text",
        text: wasAuthenticated ? "Signed out of Inflight." : "You weren't signed in."
      }]
    };
  }
);
server.tool(
  "get_git_info",
  "Get branch and change info from a git project",
  {
    directory: z.string().optional().describe("Directory path (defaults to cwd)")
  },
  async (args) => {
    const dir = args.directory || process.cwd();
    console.error(`[Local MCP] Getting git info for: ${dir}`);
    const info = getGitInfo(dir);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(info, null, 2)
      }]
    };
  }
);
server.tool(
  "analyze_dependencies",
  "Analyze which files are needed for a partial share based on what changed.",
  {
    projectPath: z.string().describe("Absolute path to the project root directory"),
    changedFiles: z.array(z.string()).optional().describe("Array of changed file paths relative to project root. Auto-detected from git diff if not provided."),
    baseBranch: z.string().optional().describe("Base branch to diff against (default: main or master)")
  },
  async (args) => {
    console.error(`[Local MCP] Analyzing dependencies for: ${args.projectPath}`);
    try {
      const result = await analyzeProjectDependencies(
        args.projectPath,
        args.changedFiles,
        args.baseBranch
      );
      console.error(`[Local MCP] Analysis complete in ${result.metadata.analysisTimeMs}ms`);
      console.error(`[Local MCP]   Changed files: ${result.changedFiles.length}`);
      console.error(`[Local MCP]   Entry points: ${result.metadata.entryPoints.length}`);
      console.error(`[Local MCP]   Local files: ${result.dependencies.localFiles.length}`);
      console.error(`[Local MCP]   NPM packages: ${result.dependencies.npmPackages.length}`);
      console.error(`[Local MCP]   Workspace packages: ${result.dependencies.workspacePackages.length}`);
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Local MCP] Analysis failed: ${message}`);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true
      };
    }
  }
);
server.tool(
  "share",
  "Share your project to Inflight for review. Uploads your code, builds a live prototype, and creates a shareable link.",
  {
    directory: z.string().optional().describe("Project directory (defaults to cwd)"),
    workspaceId: z.string().optional().describe("Inflight workspace ID"),
    existingProjectId: z.string().optional().describe("Add version to existing project"),
    useStaticAnalysis: z.boolean().optional().describe("Use static dependency analysis to upload only relevant files (experimental, default: false)")
  },
  async (args, extra) => {
    const dir = args.directory || process.cwd();
    const progressToken = extra._meta?.progressToken;
    resetMessageState();
    const sendProgress = async (progress, total, message) => {
      if (message) {
        await log(`[${progress}%] ${message}`);
      }
      if (message && progressToken && extra.sendNotification) {
        const friendly = toFriendlyMessage(progress, message);
        if (friendly) {
          try {
            await extra.sendNotification({
              method: "notifications/progress",
              params: {
                progressToken,
                progress,
                total,
                message: friendly
              }
            });
          } catch {
          }
        }
      }
    };
    await sendProgress(0, 100, "Preparing to share...");
    if (!existsSync3(dir)) {
      return {
        content: [{ type: "text", text: `Couldn't find that directory: ${dir}` }],
        isError: true
      };
    }
    await sendProgress(2, 100, "Connecting to Inflight...");
    const csbHealthy = await shareApiHealthCheck();
    if (!csbHealthy) {
      return {
        content: [{
          type: "text",
          text: `Couldn't reach Inflight servers. Check your internet connection and try again.`
        }],
        isError: true
      };
    }
    await sendProgress(5, 100, "Reading your changes...");
    const gitInfo = getGitInfo(dir);
    if (!gitInfo.isGitRepo) {
      return {
        content: [{ type: "text", text: "This folder isn't a git repo \u2014 make sure you're in the right project directory." }],
        isError: true
      };
    }
    const isFullShare = !gitInfo.diff;
    if (isFullShare) {
      await log("No branch diff found \u2014 sharing the full project instead.");
    }
    await log(`Branch: ${gitInfo.currentBranch}`);
    let authData = getAuthData();
    if (!authData) {
      await sendProgress(8, 100, "Authenticating with InFlight...");
      try {
        authData = await authenticate((msg) => log(msg));
      } catch (authError) {
        const authMessage = authError instanceof Error ? authError.message : String(authError);
        return {
          content: [{ type: "text", text: `Couldn't sign in to Inflight. Try running /inflight login first.

${authMessage}` }],
          isError: true
        };
      }
    }
    let useGitClone = false;
    let githubAppTip = null;
    if (gitInfo.gitUrl && args.workspaceId) {
      try {
        await sendProgress(9, 100, "Checking repository access...");
        const checkResponse = await fetch(`${SHARE_API_URL}/share/check-clone`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authData.apiKey}`
          },
          body: JSON.stringify({
            gitUrl: gitInfo.gitUrl,
            workspaceId: args.workspaceId
          })
        });
        if (checkResponse.ok) {
          const checkResult = await checkResponse.json();
          useGitClone = checkResult.cloneAvailable === true;
          if (useGitClone) {
            await log(`  Git clone available for ${gitInfo.gitUrl}`);
          } else if (gitInfo.gitUrl.includes("github.com")) {
            await log(`  GitHub repo detected but InFlight GitHub App not installed for this workspace`);
            githubAppTip = "Tip: Install the InFlight GitHub App to make sharing faster. Instead of uploading files, InFlight can clone your repo directly. Install it here: https://github.com/apps/inflight-app/installations/new";
          }
        }
      } catch {
        await log(`  Clone check failed, falling back to file upload`);
      }
    }
    if (useGitClone) {
      await sendProgress(10, 100, "Git clone available, skipping file upload...");
      try {
        const result = await callCloneShareWithSSE(
          {
            gitDiff: {
              diff: gitInfo.diff,
              diffStat: gitInfo.diffStat || "",
              baseBranch: gitInfo.baseBranch || "main",
              currentBranch: gitInfo.currentBranch || "unknown"
            },
            gitUrl: gitInfo.gitUrl,
            currentBranch: gitInfo.currentBranch || "unknown",
            workspaceId: args.workspaceId,
            existingProjectId: args.existingProjectId
          },
          authData.apiKey,
          // Remap server percentages (0-100) to our range (10-100)
          // so progress never jumps backwards after local steps reach 10%
          async (percentage, step) => {
            const remapped = 10 + Math.floor(percentage / 100 * 90);
            await sendProgress(remapped, 100, step);
          },
          async (message) => {
            await log(`Server error: ${message}`, "error");
          }
        );
        await sendProgress(100, 100, "Share complete!");
        await log("========== SUCCESS (clone mode) ==========");
        await log(`Preview URL: ${result.previewUrl}`);
        await log(`InFlight URL: ${result.inflightUrl}`);
        openInBrowser(result.inflightUrl);
        await log("Opening InFlight in browser...");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              previewUrl: result.previewUrl,
              sandboxUrl: result.sandboxUrl,
              sandboxId: result.sandboxId,
              inflightUrl: result.inflightUrl,
              versionId: result.versionId,
              projectId: result.projectId,
              cloneMode: true,
              diffSummary: result.diffSummary
            }, null, 2)
          }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await log(`Clone share failed: ${message}`, "warning");
        await log(`Falling back to file upload...`);
      }
    }
    let files;
    let usedStaticAnalysis = false;
    if (args.useStaticAnalysis) {
      await sendProgress(10, 100, "Analyzing dependencies...");
      try {
        const analysisResult = await analyzeProjectDependencies(dir, void 0, gitInfo.baseBranch);
        const localFiles = analysisResult.dependencies.localFiles;
        await log(`  Analysis completed in ${analysisResult.metadata.analysisTimeMs}ms`);
        await log(`  Changed files: ${analysisResult.changedFiles.length}`);
        await log(`  UI-relevant entry points: ${analysisResult.metadata.entryPoints.length}`);
        await log(`  Local dependencies: ${localFiles.length}`);
        await log(`  NPM packages: ${analysisResult.dependencies.npmPackages.length}`);
        if (localFiles.length > 0) {
          await sendProgress(11, 100, `Reading ${localFiles.length} analyzed files...`);
          files = readSpecificFiles(dir, localFiles, true, true);
          usedStaticAnalysis = true;
          await log(`  Using static analysis: ${Object.keys(files).length} files to upload`);
        } else {
          await log(`  No UI-relevant dependencies found, falling back to full upload`);
          await sendProgress(11, 100, "Reading all project files...");
          files = readProjectFiles(dir, true);
        }
      } catch (analysisError) {
        const errorMsg = analysisError instanceof Error ? analysisError.message : String(analysisError);
        await log(`  Static analysis failed: ${errorMsg}`, "warning");
        await log(`  Falling back to full project upload`);
        await sendProgress(11, 100, "Reading all project files...");
        files = readProjectFiles(dir, true);
      }
    } else {
      await sendProgress(10, 100, "Reading project files...");
      files = readProjectFiles(dir, true);
    }
    const fileCount = Object.keys(files).length;
    const totalSize = calculateTotalSize(files);
    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    await log(`  ${usedStaticAnalysis ? "Analyzed" : "Found"} ${fileCount} files (${sizeMB} MB)`);
    const filesAsFileMap = files;
    const useChunkedUpload = needsChunkedUpload(filesAsFileMap);
    if (useChunkedUpload) {
      await sendProgress(12, 100, "Uploading project...");
      try {
        const result = await callChunkedShare(
          filesAsFileMap,
          {
            diff: gitInfo.diff,
            diffStat: gitInfo.diffStat || "",
            baseBranch: gitInfo.baseBranch || "main",
            currentBranch: gitInfo.currentBranch || "unknown"
          },
          authData.apiKey,
          args.workspaceId,
          args.existingProjectId,
          gitInfo.gitUrl,
          async (percentage, step) => {
            await sendProgress(percentage, 100, step);
          },
          async (message) => {
            await log(`Error: ${message}`, "error");
          }
        );
        await sendProgress(100, 100, "Done!");
        openInBrowser(result.inflightUrl);
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              success: true,
              previewUrl: result.previewUrl,
              sandboxUrl: result.sandboxUrl,
              sandboxId: result.sandboxId,
              inflightUrl: result.inflightUrl,
              versionId: result.versionId,
              projectId: result.projectId,
              fileCount,
              chunkedUpload: true,
              ...githubAppTip && { githubAppTip }
            }, null, 2)
          }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: "text",
            text: `Something went wrong while sharing: ${message}`
          }],
          isError: true
        };
      }
    }
    await sendProgress(12, 100, `Uploading ${sizeMB} MB to Inflight...`);
    try {
      const result = await callShareWithSSE(
        {
          files,
          gitDiff: {
            diff: gitInfo.diff,
            diffStat: gitInfo.diffStat || "",
            baseBranch: gitInfo.baseBranch || "main",
            currentBranch: gitInfo.currentBranch || "unknown"
          },
          userId: authData.userId,
          workspaceId: args.workspaceId,
          existingProjectId: args.existingProjectId,
          gitUrl: gitInfo.gitUrl
        },
        authData.apiKey,
        // Progress callback - remap server percentages (0-100) to our range (12-100)
        // so progress never jumps backwards after local steps reach 12%
        async (percentage, step) => {
          const remapped = 12 + Math.floor(percentage / 100 * 88);
          await sendProgress(remapped, 100, step);
        },
        async (message) => {
          await log(`Error: ${message}`, "error");
        }
      );
      await sendProgress(100, 100, "Done!");
      openInBrowser(result.inflightUrl);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            previewUrl: result.previewUrl,
            sandboxUrl: result.sandboxUrl,
            ngrokUrl: result.ngrokUrl || null,
            sandboxId: result.sandboxId,
            inflightUrl: result.inflightUrl,
            versionId: result.versionId,
            projectId: result.projectId,
            fileCount,
            diffSummary: result.diffSummary,
            ...githubAppTip && { githubAppTip }
          }, null, 2)
        }]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{
          type: "text",
          text: `Something went wrong while sharing: ${message}`
        }],
        isError: true
      };
    }
  }
);
async function callShareWithSSE(request, apiKey, onProgress, onError) {
  const url = `${SHARE_API_URL}/share`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Share failed (${response.status}): ${errorText || "Empty response"}`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === "progress" || !currentEvent && data.step) {
            const pct = data.percentage || 0;
            const step = data.step || "Processing...";
            await onProgress(pct, step);
          } else if (currentEvent === "complete") {
            return {
              inflightUrl: data.inflightUrl,
              versionId: data.versionId,
              projectId: data.projectId,
              sandboxId: data.sandboxId,
              sandboxUrl: data.sandboxUrl,
              previewUrl: data.previewUrl || data.sandboxUrl,
              ngrokUrl: data.ngrokUrl,
              diffSummary: data.diffSummary
            };
          } else if (currentEvent === "error") {
            await onError(data.message || "Share failed");
            throw new Error(data.message || "Share failed");
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Share failed") {
            continue;
          }
          throw e;
        }
        currentEvent = "";
      }
    }
  }
  throw new Error("Share stream ended without completion");
}
async function callCloneShareWithSSE(request, apiKey, onProgress, onError) {
  const url = `${SHARE_API_URL}/share/clone`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Clone share failed (${response.status}): ${errorText || "Empty response"}`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === "progress" || !currentEvent && data.step) {
            const pct = data.percentage || 0;
            const step = data.step || "Processing...";
            await onProgress(pct, step);
          } else if (currentEvent === "complete") {
            return {
              inflightUrl: data.inflightUrl,
              versionId: data.versionId,
              projectId: data.projectId,
              sandboxId: data.sandboxId,
              sandboxUrl: data.sandboxUrl,
              previewUrl: data.previewUrl || data.sandboxUrl,
              ngrokUrl: data.ngrokUrl,
              diffSummary: data.diffSummary
            };
          } else if (currentEvent === "error") {
            await onError(data.message || "Clone share failed");
            throw new Error(data.message || "Clone share failed");
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Clone share failed") {
            continue;
          }
          throw e;
        }
        currentEvent = "";
      }
    }
  }
  throw new Error("Clone share stream ended without completion");
}
async function callChunkedShare(files, gitDiff, apiKey, workspaceId, existingProjectId, gitUrl, onProgress, onError) {
  const chunks = chunkFiles(files);
  const stats = getChunkStats(chunks);
  await onProgress(8, "Uploading project...");
  const initResponse = await fetch(`${SHARE_API_URL}/share/chunked/init`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      gitDiff,
      totalChunks: stats.totalChunks,
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize
    })
  });
  if (!initResponse.ok) {
    const errorText = await initResponse.text();
    throw new Error(`Failed to initialize chunked upload: ${errorText}`);
  }
  const { sessionId, sandboxId } = await initResponse.json();
  const totalMB = (stats.totalSize / (1024 * 1024)).toFixed(1);
  let uploadedSize = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkSize = Object.values(chunk).reduce((sum, content) => sum + content.length, 0);
    const chunkProgress = 10 + Math.floor((i + 1) / chunks.length * 30);
    uploadedSize += chunkSize;
    const uploadedMB = (uploadedSize / (1024 * 1024)).toFixed(1);
    await onProgress(chunkProgress, `Uploading ${uploadedMB}/${totalMB} MB...`);
    const uploadResponse = await fetch(`${SHARE_API_URL}/share/chunked/${sessionId}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        files: chunk,
        chunkIndex: i,
        totalChunks: chunks.length
      })
    });
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Failed to upload chunk ${i + 1}: ${errorText}`);
    }
    await uploadResponse.json();
  }
  await onProgress(42, "Building prototype...");
  const finalizeResponse = await fetch(`${SHARE_API_URL}/share/chunked/${sessionId}/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      workspaceId,
      existingProjectId,
      gitUrl
    })
  });
  if (!finalizeResponse.ok) {
    const errorText = await finalizeResponse.text();
    throw new Error(`Failed to finalize chunked upload: ${errorText}`);
  }
  const reader = finalizeResponse.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done)
      break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    let currentEvent = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === "progress" || !currentEvent && data.step) {
            const serverPct = data.percentage || 0;
            const mappedPct = 45 + Math.floor(serverPct / 100 * 55);
            await onProgress(mappedPct, data.step || "Processing...");
          } else if (currentEvent === "complete") {
            return {
              inflightUrl: data.inflightUrl,
              versionId: data.versionId,
              projectId: data.projectId,
              sandboxId: data.sandboxId,
              sandboxUrl: data.sandboxUrl,
              previewUrl: data.previewUrl || data.sandboxUrl,
              ngrokUrl: data.ngrokUrl,
              diffSummary: data.diffSummary
            };
          } else if (currentEvent === "error") {
            await onError(data.message || "Share failed");
            throw new Error(data.message || "Share failed");
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Share failed") {
            continue;
          }
          throw e;
        }
        currentEvent = "";
      }
    }
  }
  throw new Error("Chunked share stream ended without completion");
}
server.prompt(
  "partial-share",
  "Share UI changes from your feature branch as an interactive prototype on Inflight for review",
  {
    directory: z.string().optional().describe("Project directory (defaults to cwd)")
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Share my UI changes to Inflight for review.

Steps:
1. Run \`git status\` to verify this is a git repo on a feature branch with commits. If on main/master or no changes, let me know and stop.
2. Call the \`share\` MCP tool with directory set to the current project directory (${args.directory || "use your working directory"}).
3. Show the result: "Shared to Inflight: [inflightUrl] \u2014 Share this link with your team for feedback."

IMPORTANT: Always pass the \`directory\` parameter to the share tool \u2014 do not rely on defaults.`
          }
        }
      ]
    };
  }
);
server.prompt(
  "full-share",
  "Share your entire project to Inflight for feedback and collaboration",
  {
    directory: z.string().optional().describe("Project directory (defaults to cwd)")
  },
  async (args) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Share my full project to Inflight for feedback.

Steps:
1. If this is a git repo on a feature branch with commits, suggest using /partial-share instead for a more focused share.
2. Read all source files, excluding: .git/, node_modules/, dist/, build/, .next/, out/, *.lock files, and .env* files. Always exclude .env files \u2014 never include them.
3. Call the \`share\` MCP tool with the files, an empty gitDiff, and directory set to the current project directory (${args.directory || "use your working directory"}).
4. Show the result: "Shared to Inflight: [URL] \u2014 Share this link with your team for feedback."

IMPORTANT: Always pass the \`directory\` parameter to the share tool \u2014 do not rely on defaults. Always exclude .env files.`
          }
        }
      ]
    };
  }
);
server.prompt(
  "manage",
  "Manage Inflight prototypes \u2014 list, delete, or view shared prototypes and projects",
  {
    action: z.string().optional().describe("Action: list, delete, or projects")
  },
  async (args) => {
    const action = args.action?.toLowerCase();
    let instructions;
    if (action === "list") {
      instructions = `List my Inflight prototypes. Call the \`prototype_list\` MCP tool and show results as a formatted list with: Project Name, Type, Status, Inflight URL, and Created date. If none found, say "No prototypes yet. Use /share to share your first one."`;
    } else if (action === "delete") {
      instructions = `Help me delete an Inflight prototype. First call \`prototype_list\` to show my prototypes. Ask which one to delete. Confirm with "Delete [name]? This can't be undone." Then call \`prototype_delete\` with the sandbox ID.`;
    } else if (action === "projects") {
      instructions = `List my Inflight projects. Call the \`list_projects\` MCP tool and show results as a formatted list with: Project Name, Description, and Created date.`;
    } else {
      instructions = `I want to manage my Inflight prototypes. Ask me what I'd like to do:
- **List prototypes** \u2014 Show all shared prototypes
- **Delete prototype** \u2014 Remove a prototype
- **List projects** \u2014 Show all projects

Then execute the selected action.`;
    }
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: instructions
          }
        }
      ]
    };
  }
);
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Inflight] Ready");
}
main().catch((error) => {
  console.error("[Local MCP] Fatal error:", error);
  process.exit(1);
});
