const callback = (e) => {
	if (e.key == "Escape") {
		document.removeEventListener("keydown", callback);
		Messaging.post({
			instruction: "halt",
		});
	}
};

document.addEventListener("keydown", callback);
