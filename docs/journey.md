
Dec 30, 2025 09:30AM
- A lot has changed back then see `webgpu-simulation` branch for more detail.
- Got tired of manually creating vertices, instead I used a BlockBench to model a mesh (Everything got easier),
manual vertices still has a place in my heart, for now I'll use this.
- Recently I was obsessed in creating block of rocks with scars on the edges, you'll see in the `public/assets/rocs`
the object files that I created, it may not that artistic but hey.
- What I love in this journey of creating a game (it's far from it) is that there's a lot of venue you could progress,
for instance you could model a mesh today and just that, or type few lines of code etc.
- What is not in place however is the predictability of the cubes (our past model premitive), now I have to create a tree 
wherein I could match the triangles on the scene graph (leaves) to ray trace the shadow.
- For now I could only tell you about these progress, I have some progress that I didn't log, it's all visible in the commit graph.
PS. There's also a lot of code to be cleaned up.

Nov 23, 2025 10:36PM
- Ray from mouse pointer.
- Note that I've duplicated the shader and the typescript for 'P' and 'V',
make sure the parameters are aligned, refactor later.

Oct 26, 2025 9:11PM
- `mat.mulM44([], cube.model, M); // local space.`
- `mat.mulM44([], M, cube.model); // world space.`
Oct 26, 2025 4:28PM
- Scene graph
- Pass translation
- Golden order: P * V * T * R * S
	- P: Perspective
	- V: Camera
	- T: Translation
	- R: Rotation
	- S: Scale

Oct 25, 2025 10:19PM
- Today I achieved 3D interactive cube.
- FOV values:
	- 45–60° → comfortable, cinematic
	- 70–90° → wide-angle, fast movement feel
	- <40° → zoomed, dramatic depth (telephoto look)

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
