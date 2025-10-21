
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
	var vsOut: VsOutput;
	vsOut.position = vec4f(pos[vertexIndex].position, 0.0, 1.0);
	// 3 vertices per triangle.
	let triId = vertexIndex / 3u;
	vsOut.color = color[triId]; // same color per triangle.
	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	return vsOut.color;
}
