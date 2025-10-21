
Oct 16, 2025. 10:23PM
- Creating meshes
	- Color lookup.
	
	- 💡 **The “realistic” hierarchy**
		- **Per-vertex color**
			- Memory: 🔺 High
			- CPU cost: ✅ Low
			- GPU cost: ✅ Very low
			- Typical use: Almost everything
		- **Per-triangle color**
			- Memory: ✅ Lower
			- CPU cost: ✅ Low
			- GPU cost: 🔺 Slight shader overhead
			- Typical use: Debug / procedural geometry
		- **Indexed per-color**
			- Memory: ✅✅ Lowest
			- CPU cost: 🔺 Moderate
			- GPU cost: 🔺 Slight indirection cost
			- Typical use: Batching, massive meshes
		- **Per-instance color**
			- Memory: ✅✅✅✅
			- CPU cost: ✅ Low
			- GPU cost: ✅
			- Typical use: Instanced rendering

- VertexStruct
```wgsl
struct Vertex {
	position: vec3f,   // world or local space position
	normal: vec3f,     // for lighting
	uv: vec2f,         // texture coordinate
	color: vec4f,      // vertex color (optional)
	offset: vec2f,     // optional (for 2D / procedural offset)
};
```

- Regarding reassigning buffer with different lenght per frame.
	- You can allocate max buffer size
	- Or you could `.destroy` the previous buffer and create new.
	- It will not affect the resource binding in bindgroup.

- Storage buffer
	- WTF! 500k rectangles / frame.
	- That's the power of storage buffer.
- Loop
	- Never create bindgroup per frame.
	- Do update the data and write buffer to queue.
- Unniforms multiple using data
	- vs and fs are jus function nothing else (kernel programs).
	- you have nothing in control of execution, that's the gpu's job.
	- you just setup commands and enqueue them.
	- that's why even though its pointing on the same group and binding,
		it doesn't override things.
	- then webgpu executes on what's in the queue.
	- Right now there's one big command buffer. OK.
	- Next optimization is one big uniformbuffer/storagebuffer for the whole entities.
- Uniforms are global variables to binded before
executing pipeline.
	- Remember 1 buffer, one binding first for basic.
- Interchange variables are variables that bridget vs to fs.
basically fs(vs(..))
	- They are linked via `@builtin(position)`
	- IT's important to note that variable `position` is differnt from the `position`
	in which webgpu defines it.
		- Meaning, `@builtin(position) position: vec4f,` first position is wgsl,
		- the `tion) position: vec4` position is the variable name, can be named `foo`.
