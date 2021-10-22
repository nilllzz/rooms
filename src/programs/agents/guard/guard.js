class AgentGuard {
	checkAccess(keyhole) {
		const params = new URLSearchParams(window.location.search);
		const key = params.get("key");

		console.log(keyhole, key);
	}
}
