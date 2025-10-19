
struct VsOutput {
	@builtin(position) position: vec4f,
	// @location(0) color: vec4f,
};

struct VertexStruct {
	position: vec2f,
}

@group(0) @binding(0) var<storage, read> pos: array<VertexStruct>;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32
) -> VsOutput {
	var vsOut: VsOutput;
	vsOut.position = vec4f(pos[vertexIndex].position, 0.0, 1.0);
	return vsOut;
}

@fragment fn fs(vsOut: VsOutput) -> @location(0) vec4f {
	// Carrot
	return vec4f(0.9019607843137255, 0.49411764705882355, 0.13333333333333333, 1);
}
