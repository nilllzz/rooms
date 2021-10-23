let hasFinishedLoading = true;
let loadingTimeoutHandle = null;
let loadingAnimationState = 0;

function onMainframeLoaded() {
	clearLoadingTimeout();
	hasFinishedLoading = true;

	const loadingOverlay = document.getElementById("loading-overlay");
	loadingOverlay.style.display = "none";
}

function clearLoadingTimeout() {
	if (loadingTimeoutHandle) {
		clearTimeout(loadingTimeoutHandle);
		loadingTimeoutHandle = null;
	}
}

function load(target, access = {}) {
	// Make sure we clear any previous loading timeouts.
	clearLoadingTimeout();

	// Show loading overlay.
	const loadingOverlay = document.getElementById("loading-overlay");
	loadingOverlay.style.display = "flex";

	// Load frame
	const frameSrc = "./programs/" + target + "/index.html";

	// First, set the flag to indicate we started loading.
	// Once the frame loaded, it'll be unset again.
	// If the frame fails to load after 5 seconds, assume it cannot be loaded.

	hasFinishedLoading = false;

	// On HTTP/S we can actually directly send a request to the target file to see if it exists.
	if (location.protocol === "http:" || location.protocol === "https:") {
		// TODO: make this async
		const request = new XMLHttpRequest();
		request.open("GET", frameSrc, false);
		request.send(null);

		// Loading did not succeed.
		if (request.status !== 200) {
			load("error");
			return;
		}
	}

	// Create access code query params.
	let frameQuery = "";
	for (const accessName in access) {
		const accessValue = access[accessName];
		if (frameQuery === "") {
			frameQuery += "?";
		} else {
			frameQuery += "&";
		}
		frameQuery += accessName;
		if (accessValue !== "") {
			frameQuery += "=" + encodeURIComponent(accessValue);
		}
	}

	// Set new target src.
	const frame = document.getElementById("main-frame");
	frame.src = frameSrc + frameQuery;

	// Start up timeout.
	loadingTimeoutHandle = setTimeout(() => {
		clearLoadingTimeout();

		if (!hasFinishedLoading) {
			load("error");
		}
	}, 5000);
}

function halt() {
	const frame = document.getElementById("main-frame");
	frame.remove();
}

function reset() {
	load("auth");
}

// Create interval to update the loading text.
setInterval(() => {
	const loadingOverlay = document.getElementById("loading-overlay");
	if (loadingOverlay) {
		loadingAnimationState++;
		loadingOverlay.innerText =
			"<LOADING>\n" + ["/", "-", "\\", "|"][loadingAnimationState % 4];
	}
}, 100);

// Register loader message event handler.
window.onmessage = async function (e) {
	// Only react to messages with the correct Messaging format.
	if (!e.data["message-id"] || !e.data["message-data"]) {
		return;
	}

	const data = e.data["message-data"];

	if (!data.instruction) {
		load("error");
		return;
	}

	let responseData = {};
	let responseError = null;

	try {
		switch (data.instruction) {
			case "load":
				load(data.target, data.access ?? {});
				break;
			case "halt":
				halt();
				break;
			case "reset":
				reset();
				break;
			case "io":
				responseData = IO.runCommand(data.command, data.args);
				break;
			case "gjcreds":
				responseData = await GJCreds.runCommand(
					data.command,
					data.args
				);
				break;
			case "gjapi":
				responseData = await GJApi.runCommand(data.command, data.args);
				break;
			case "net":
				responseData = await Net.runCommand(data.command, data.args);
				break;
		}
	} catch (error) {
		// When a command has thrown an error, in case we want to respond,
		// set the response error object.
		if (typeof error.serialize == "function") {
			responseError = error.serialize();
		} else {
			responseError = {
				name: error.name,
				message: error.message,
				data: {},
			};
		}
	}

	if (e.data["respond"]) {
		// Post a response to the frame.
		const frame = document.getElementById("main-frame");
		frame.contentWindow.postMessage(
			{
				"response-id": e.data["message-id"],
				"response-error": responseError,
				"response-data": responseData,
			},
			"*"
		);
	}
};

const frame = document.getElementById("main-frame");
frame.focus();
frame.onload = () => onMainframeLoaded();

// Load GJ Credentials (if they are set) from frame location.
GJCreds.init();

// Start by showing auth.
load("auth");
//load("rooms/basement");
