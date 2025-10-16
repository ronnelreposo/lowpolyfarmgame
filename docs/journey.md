
Oct 16, 2025. 10:23PM
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
