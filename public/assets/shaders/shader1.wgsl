
struct OurVertextShaderOutput {
	@builtin(position) position: vec4f,
	@location(0) color: vec4f,
};

struct OurStruct {
	color: vec4f,
	offset: vec2f,
};

struct OtherStruct {
	scale: vec2f,
	// _padding: vec2f, // to satisfy 16-byte alignment
}

@group(0) @binding(0) var<uniform> ourStruct0: OurStruct;
@group(0) @binding(1) var<uniform> otherStruct: OtherStruct;

@vertex fn vs(
	@builtin(vertex_index) vertexIndex : u32
) -> @builtin(position) vec4f {
	let pos = array(
		vec2f(0.0, 0.5), // top center
		vec2f(-0.5, -0.5), // bottom left
		vec2f(0.5, -0.5) // bottom right
	);
	let color = array<vec4f, 3>(
		vec4f(1, 0, 0, 1), // red.
		vec4f(0, 1, 0, 1), // green.
		vec4f(0, 0, 1, 1) // blue.
	);
	return vec4f(
		pos[vertexIndex] * otherStruct.scale + ourStruct0.offset, 0.0, 1.0);
}

@fragment fn fs() -> @location(0) vec4f {
	return ourStruct0.color;
}
