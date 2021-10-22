class PrgChronos {
	/** @type {Terminal} */
	term;

	constructor() {
		this.term = new Terminal(document.getElementById("screen"));
	}

	run() {
		this.term.init();
	}
}

// Create and run the chronos program.
const __prg__chronos = new PrgChronos();
__prg__chronos.run();
