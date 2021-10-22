class AgentEscape {
	static escape() {
		Messaging.post({
			instruction: "load",
			target: "chronos",
		});
	}

	static registerEscape() {
		const callback = (e) => {
			if (e.key == "Escape") {
				document.removeEventListener("keydown", callback);
				this.escape();
			}
		};

		document.addEventListener("keydown", callback);
	}
}
