class CommonIOClass {
	/**
	 * Parses a path string into a path array.
	 *
	 * @param {string} pathStr
	 * @return {string[]}
	 */
	parsePath(pathStr) {
		// Make sure we have some string.
		if (typeof pathStr !== "string") {
			pathStr = "/";
		} else if (pathStr === "") {
			pathStr = "/";
		}

		// Remove any potential whitespace, make uppercase.
		pathStr = pathStr.trim().toUpperCase();

		// Remove leading and trailing /
		while (pathStr.startsWith("/")) {
			pathStr = pathStr.substr(1);
		}
		while (pathStr.endsWith("/")) {
			pathStr = pathStr.substr(0, pathStr.length - 1);
		}

		let path = pathStr.split("/");

		// Remove any empty parts.
		path = path.filter((i) => i.trim() !== "");

		return path;
	}

	/**
	 * Converts an array of path parts back into a path string.
	 * @param {string[]} path
	 */
	unparsePath(path) {
		return "/" + path.join("/");
	}
}

class CommonClass {
	IO = new CommonIOClass();

	/**
	 * Generates a hash from an input string using the specified algorithm.
	 * @param {string} text
	 * @returns {Promise<string>}
	 */
	async getHash(text, algo = "SHA-256") {
		const encoder = new TextEncoder();
		const data = encoder.encode(text);
		const hashBuffer = await window.crypto.subtle.digest(algo, data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return hashHex;
	}
}

const Common = new CommonClass();
