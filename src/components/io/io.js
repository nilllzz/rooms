const __IO_LOCAL_STORAGE = "chronos-io";

class IOClass {
	data = {};

	constructor() {
		this._createLS();
	}

	_getStorageUserId() {
		return GJCreds.userId ?? 0;
	}

	_getLSKey() {
		return this._getStorageUserId() + "-" + __IO_LOCAL_STORAGE;
	}

	_createLS() {
		const data = localStorage.getItem(this._getLSKey());
		if (data === null) {
			this.overwriteLS(this._createInitial());
		} else {
			this.data = JSON.parse(data);
		}

		console.log(
			"Loaded CHRONOS IO storage",
			this._getStorageUserId(),
			this.data
		);
	}

	overwriteLS(data) {
		this.data = data;
		this._saveLS();
	}

	_createInitial() {
		return {
			t: "d",
			n: "ROOT",
			c: [
				{
					t: "d",
					n: "HOME",
					c: [
						{
							t: "f",
							n: "README.TXT",
							c: "Thank you for purchasing this APPIX machine!",
						},
					],
				},
				{
					t: "d",
					n: "BIN",
					c: [
						{
							t: "d",
							n: "SYS",
							c: [],
						},
						{
							t: "d",
							n: "USR",
							c: [],
						},
					],
				},
				{
					t: "d",
					n: "SECRET",
					c: [
						{
							t: "f",
							n: "PASSWD",
							c: "515F3EE095CBB3803F099FA9C7CF9F195C12730C08940716218C3996F86FDF97",
						},
						{
							t: "d",
							n: "ROOMS",
							c: [
								{
									t: "f",
									n: "418.KEY",
									c: "3FDBA35F04DC8C462986C992BCF875546257113072A909C162F7E470E581E278",
								},
							],
						},
					],
				},
			],
		};
	}

	_saveLS() {
		localStorage.setItem(this._getLSKey(), JSON.stringify(this.data));
	}

	_getObjForPath(path = [], obj = null) {
		let cData = obj;
		if (obj === null) {
			cData = this.data;
		}

		while (path.length > 0) {
			const nextPath = path.shift();
			// Ignore empty path parts.
			if (nextPath === "") {
				continue;
			}

			let foundSub = false;

			for (const child of cData.c) {
				if (child.n == nextPath) {
					cData = child;
					foundSub = true;
					break;
				}
			}

			if (foundSub) {
				continue;
			}

			// Cannot find sub.
			return null;
		}

		return cData;
	}

	runCommand(command, args) {
		switch (command) {
			case "load":
				return this.load();
			case "list":
				return this.list(args["path"]);
			case "read":
				return this.read(args["path"]);
			case "write":
				return this.write(args["path"], args["contents"]);
			case "mk-file":
				return this.mkFile(args["path"]);
			case "mk-dir":
				return this.mkDir(args["path"]);
			case "remove":
				return this.remove(args["path"]);
			case "exists":
				return this.exists(args["path"]);
		}
	}

	load() {
		this._createLS();
	}

	list(path = []) {
		const obj = this._getObjForPath(path);
		if (obj === null) {
			throw new IOError(IOError.CODE_NOT_FOUND, "list", "Dir not found");
		}

		const dirs = obj.c
			.filter((i) => i.t === "d")
			.sort((a, b) => a.n.localeCompare(b.n));
		const files = obj.c
			.filter((i) => i.t === "f")
			.sort((a, b) => a.n.localeCompare(b.n));
		return [...dirs, ...files];
	}

	read(path = []) {
		const obj = this._getObjForPath(path);

		if (obj === null) {
			throw new IOError(IOError.CODE_NOT_FOUND, "read", "File not found");
		}

		// Return file contents, or directory item amount.
		if (obj.t == "f") {
			return obj.c;
		} else {
			return obj.c.length;
		}
	}

	write(path = [], contents) {
		// Create the file if it doesn't exist yet.
		this.mkFile(path);

		const obj = this._getObjForPath(path);

		if (obj === null) {
			throw new IOError(
				IOError.CODE_NOT_FOUND,
				"write",
				"File not found"
			);
		}

		// Do not write to directories.
		if (obj.t == "d") {
			throw new IOError(
				IOError.CODE_REQUIRE_FILE,
				"write",
				"Cannot write to directory"
			);
		}

		obj.c = contents;
		// Save after modifications were made.
		this._saveLS();
	}

	_mk(path = [], type) {
		const op = type === "f" ? "mk-file" : "mk-dir";

		// Cannot create with no target item given.
		if (path.length == 0) {
			return;
		}

		// Get the containing directory of the requested new item.
		const parentPath = path.slice(0, path.length - 1);
		const parentObj = this._getObjForPath(parentPath);
		if (parentObj === null) {
			throw new IOError(
				IOError.CODE_NOT_FOUND,
				op,
				"Parent directory not found"
			);
		}

		// Cannot create within a file.
		if (parentObj.t == "f") {
			throw new IOError(
				IOError.CODE_REQUIRE_DIR,
				op,
				"Parent is not a directory"
			);
		}

		const newItemName = path[path.length - 1];
		// Make sure that item doesn't exist yet.
		for (const child of parentObj.c) {
			if (child.n == newItemName) {
				// Soft fail, it is ok to touch a child that already exists.
				return;
			}
		}

		const newItem = {
			t: type,
			n: newItemName,
			c: type === "f" ? "" : [],
		};
		parentObj.c.push(newItem);

		// Save after modifications were made.
		this._saveLS();
	}

	mkFile(path = []) {
		this._mk(path, "f");
	}

	mkDir(path = []) {
		this._mk(path, "d");
	}

	remove(path = []) {
		// Cannot remove ROOT.
		if (path.length == 0) {
			throw new IOError(
				IOError.CODE_ACCESS_DENIED,
				"remove",
				"Access to ROOT denied"
			);
		}

		// Get the parent DIR to remove the node from.
		const parentPath = path.slice(0, path.length - 1);
		const parentObj = this._getObjForPath(parentPath);
		if (parentObj === null) {
			throw new IOError(
				IOError.CODE_NOT_FOUND,
				"remove",
				"Parent directory not found"
			);
		}
		// Can only remove from a directory.
		if (parentObj.t !== "d") {
			throw new IOError(
				IOError.CODE_REQUIRE_DIR,
				"remove",
				"Parent is not a directory"
			);
		}

		const obj = this._getObjForPath(path);
		if (obj === null) {
			throw new IOError(
				IOError.CODE_NOT_FOUND,
				"remove",
				"File not found"
			);
		}

		// Exclude obj from parent content list.
		parentObj.c = parentObj.c.filter((i) => i !== obj);

		// Save after modifications were made.
		this._saveLS();
	}

	exists(path = []) {
		const obj = this._getObjForPath(path);
		if (obj === null) {
			return;
		}
		return obj.t;
	}
}

const IO = new IOClass();

class IOError extends Error {
	static CODE_NOT_FOUND = 1;
	static CODE_REQUIRE_FILE = 2;
	static CODE_REQUIRE_DIR = 3;
	static CODE_ACCESS_DENIED = 4;

	code;
	op;

	constructor(code, op, message) {
		super(message);

		this.code = code;
		this.op = op;
		this.name = "IOError";
	}

	serialize() {
		return {
			name: this.name,
			message: this.message,
			data: {
				code: this.code,
				op: this.op,
			},
		};
	}
}
