
struct VsOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
};

struct VertexStruct {
	position: vec2f,
}

@group(0) @binding(0) var<storage, read> pos: array<VertexStruct>;
@group(0) @binding(1) var<storage, read> color: array<vec4f>;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32
) -> VsOutput {
	let T = mat4x4f(
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		0.03, -0.25, 0.0, 1.0	// move in X, move in Y
	);
	var vsOut: VsOutput;
	vsOut.position = T * vec4f(pos[vertexIndex].position, 0.0, 1.0);
	vsOut.color = color[vertexIndex]; // same color per triangle.
	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	return vsOut.color;
}
