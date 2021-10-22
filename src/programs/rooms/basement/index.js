class PrgRoomsBasement {
	_renderer;
	_scene;
	_camera;

	_testCube;

	run() {
		AgentEscape.registerEscape();

		this._renderer = new THREE.WebGLRenderer();
		this._renderer.setSize(640, 480);
		document.body.appendChild(this._renderer.domElement);

		this.initScene();
		this.draw();
	}

	initScene() {
		this._scene = new THREE.Scene();
		this._camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);

		const geometry = new THREE.BoxGeometry();
		const material = new THREE.MeshBasicMaterial({ color: 0x41ff00 });
		this._testCube = new THREE.Mesh(geometry, material);
		this._scene.add(this._testCube);

		this._camera.position.z = 1.5;
	}

	draw() {
		requestAnimationFrame(this.draw.bind(this));
		this._renderer.render(this._scene, this._camera);

		this._testCube.rotation.x += 0.01;
		this._testCube.rotation.y += 0.01;
	}
}

const __prg__rooms__basement = new PrgRoomsBasement();
__prg__rooms__basement.run();
