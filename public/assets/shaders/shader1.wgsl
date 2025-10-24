
struct VsOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
};

struct VertexStruct {
	position: vec4f,
}

@group(0) @binding(0) var<storage, read> pos: array<VertexStruct>;
@group(0) @binding(1) var<storage, read> color: array<vec4f>;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32
) -> VsOutput {

	// PICKUP HERE. Up next camera.

	let fov = radians(60.0);  // 45° field of view
	let aspect = 16.0 / 9.0;         // canvas width / height (adjust later)
	let near = 0.1;
	let far = 100.0;
	let P = perspective(fov, aspect, near, far);

	// Camera
	let eye = vec3f(0.5, -0.5, 1.0); // where your camera in world space.
	let subj = vec3f(0.0, 0.0, 0.0); // where to look at - (looking at origin (0,0,0))
	let up = vec3f(0.0, 1.0, 0.0);
	let V = lookAt(eye, subj, up);

	// pickup here: don' translate
	// Translate. a.k.a camera trick.
	let T = translate(0.0, 0.0, 3.0);// move in X, move in Y
	// Scale
	let s = 0.8; // scale factor.
	let S = mat4x4f(
		s, 0.0, 0.0, 0.0,
		0.0, s, 0.0, 0.0,
		0.0, 0.0, s, 0.0,
		0.0, 0.0, 0.0, 1.0,
	);
	// Rotation.
	let Rx = rotationX(radians(0));
	let Ry = rotationY(radians(0));
	let Rz = rotationZ(radians(0));
	var vsOut: VsOutput;
	vsOut.position = P * T * V * Rx * Ry * Rz * S * pos[vertexIndex].position;
	vsOut.color = color[vertexIndex];
	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	return vsOut.color;
}

fn translate(x: f32, y: f32, z: f32) -> mat4x4f {
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		x, y, z, 1.0,
	);
}

fn rotationIdentity(angle: f32) -> mat4x4f {
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0,
	);
}

fn rotationX(angle: f32) -> mat4x4f {
	let c = cos(angle);
	let s = sin(angle);
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, c, s, 0.0,
		0.0, -s, c, 0.0,
		0.0, 0.0, 0.0, 1.0,
	);
}

fn rotationY(angle: f32) -> mat4x4f {
	let c = cos(angle);
	let s = sin(angle);
	return mat4x4f(
		c,    0.0,  -s,   0.0,
		0.0,  1.0,   0.0, 0.0,
		s,    0.0,   c,   0.0,
		0.0,  0.0,   0.0, 1.0,
	);
}

fn rotationZ(angle: f32) -> mat4x4f {
	let c = cos(angle);
	let s = sin(angle);
	return mat4x4f(
		c,    s,   0.0, 0.0,
		-s,   c,   0.0, 0.0,
		0.0,  0.0, 1.0, 0.0,
		0.0,  0.0, 0.0, 1.0,
	);
}

fn perspective(fovY: f32, aspect: f32, near: f32, far: f32) -> mat4x4f {
	let f = 1.0 / tan(fovY * 0.5);
	return mat4x4f(
		f / aspect, 0.0, 0.0, 0.0,
		0.0, f, 0.0, 0.0,

		0.0, 0.0, far / (far - near), 1.0,
		0.0, 0.0, (-far * near) / (far - near), 0.0,

		// 0.0, 0.0, far / (near - far), 1.0,
		// 0.0, 0.0, (far * near) / (-near - far), 0.0,
	);
}

fn identityPerspective() -> mat4x4f {
	return mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0
	);
}

fn lookAt(eye: vec3f, subj: vec3f, up: vec3f) -> mat4x4f {
	let zAxis = normalize(eye - subj); // forward
	let xAxis = normalize(cross(up, zAxis)); // right
	let yAxis = cross(zAxis, xAxis); // recalculated up

	return mat4x4f(
		xAxis.x, yAxis.x, zAxis.x, 0.0,
		xAxis.y, yAxis.y, zAxis.y, 0.0,
		xAxis.z, yAxis.z, zAxis.z, 0.0,
		-dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1.0
	);
}
