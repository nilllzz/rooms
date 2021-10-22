class MessagingClass {
	/**
	 * Posts a message to the mainframe, and awaits a response.
	 */
	post(data, waitResponse = true) {
		const messageId = "m" + Date.now();
		const message = {
			"message-id": messageId,
			respond: waitResponse,
			"message-data": data,
		};

		// Post message to parent mainframe.
		window.parent.postMessage(message, "*");

		if (waitResponse) {
			return new Promise((resolve, reject) => {
				const callback = (e) => {
					if (e.data["response-id"] == messageId) {
						window.removeEventListener("message", callback);

						// Reject the promise to throw when an error was included in the response.
						if (e.data["response-error"]) {
							const err = new InvokeError(
								e.data["response-error"]
							);
							reject(err);
						} else {
							resolve(e.data["response-data"]);
						}
					}
				};

				window.addEventListener("message", callback);
			});
		}

		return new Promise((resolve) => resolve());
	}
}

const Messaging = new MessagingClass();

class InvokeError extends Error {
	prevName = "";
	prevMessage = "";
	data = {};

	constructor(data) {
		super("Message invoke threw an error.");

		this.name = "InvokeError";
		this.prevName = data.name;
		this.prevMessage = data.message;
		this.data = data.data ?? {};
	}
}
