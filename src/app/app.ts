/// <reference types="@webgpu/types" />

import { LOCATION_UPGRADE_CONFIGURATION } from "@angular/common/upgrade";
import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { animationFrames, BehaviorSubject, combineLatest, EMPTY, fromEvent, map, of, reduce, ReplaySubject, scan, startWith, Subject, switchMap, tap, throttleTime } from "rxjs";

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements AfterViewInit {
	constructor(private ngZone: NgZone) {}
	async ngAfterViewInit(): Promise<void> {
		const adapter = await navigator.gpu?.requestAdapter();
		const device = await adapter?.requestDevice();

		if (!device) {
			return;
		}
		const canvas = document.querySelector("canvas");

		const startingCamera = [1, 1, 1, 1];
		const camera$ = fromEvent<KeyboardEvent>(document!, 'keydown')
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					switch (event.key) {
						case "ArrowLeft": {
							return of([0.1, 0, 0]);
						}
						case "ArrowRight": {
							return of([-0.1, 0, 0]);
						}
						case "ArrowUp": {
							return of([0, 0.1, 0]);
						}
						case "ArrowDown": {
							return of([0, -0.1, 0]);
						}
						case "PageUp": {
							return of([0, 0, 0.1]);
						}
						case "PageDown": {
							return of([0, 0, -0.1]);
						}
						default:
							return EMPTY;
					}
				}),
				scan((acc, arr) => {
					return [
						Math.min(Math.max(acc[0] + arr[0], -1), 1),
						Math.min(Math.max(acc[1] + arr[1], -1), 1),
						Math.min(Math.max(acc[2] + arr[2], 0.1), 100),
						1
					];
				}, startingCamera),
				startWith(startingCamera),
			);

		const canvasDimension$ = new ReplaySubject<{ width: number, height: number }>(1);
		this.ngZone.runOutsideAngular(async () => {
			const observer = new ResizeObserver(entries => {
				for (const entry of entries) {
					const width = entry.contentBoxSize[0].inlineSize;
					const height = entry.contentBoxSize[0].blockSize;
					const canvas = entry.target as any;
					const newWidth = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
					const newHeight = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));
					canvas.width = newWidth;
					canvas.height = newHeight;
					canvasDimension$.next({ width: newWidth, height: newHeight });
				}
			});
			observer.observe(canvas!);
		});

		const context = canvas?.getContext("webgpu");
		const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
		context?.configure({
			device,
			format: presentationFormat,
		});
		const shaderCode = await fetch("/assets/shaders/shader1.wgsl").then(
			(r) => r.text(),
		);
		const module = device.createShaderModule({
			label: "our hardcoded red triangle shaders",
			code: shaderCode,
		});
		const pipeline = device.createRenderPipeline({
			label: "our hardcoded red triangle pipeline",
			layout: "auto",
			vertex: {
				entryPoint: "vs",
				module,
			},
			fragment: {
				entryPoint: "fs",
				module,
				targets: [{ format: presentationFormat }],
			},
			depthStencil: {
				format: "depth24plus",
				depthWriteEnabled: true,
				depthCompare: "less",
			}
		});
		const colorAttachments: GPURenderPassColorAttachment[] = [
			{
				view: undefined as unknown as GPUTextureView,
				loadOp: "clear",
				storeOp: "store",
				clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
			},
		];

		const cz = 0.5; // cube z.
		const entities: Entity[] = [
			// {
			// 	kind: "quad",
			// 	triangleCount: 2,
			// 	verts: createQuadVertices(),
			// 	color: [0.9019607843137255, 0.49411764705882355, 0.13333333333333333, 1] // carrot.
			// },
			// {
			// 	kind: "tri",
			// 	triangleCount: 1,
			// 	verts: [
			// 		// x, y, z(actual depth), w(const)
			// 		0.0, 0.5, 0.3, 1.0,	// top
			// 		-0.5, -0.5, 0.3, 1.0,	// bottom left
			// 		0.5, -0.5, 0.3, 1.0,	// bottom right
			// 	],
			// 	color: rgbaToColor(142, 68, 173), // wisteria (violet)
			// },
			// // much fater triangle
			// {
			// 	kind: "tri",
			// 	triangleCount: 1,
			// 	verts: [
			// 		// x, y, z(actual depth), w(const)
			// 		-0.5, 0.5, 0.7, 1.0,	// top
			// 		-0.8, -0.5, 0.7, 1.0,	// bottom left
			// 		-0.2, -0.5, 0.7, 1.0,	// bottom right
			// 	],
			// 	color: rgbaToColor(52, 152, 219), // peter river (blue)
			// },
			{
				kind: "free",
				triangleCount: 12,
				verts: [
					// FRONT face (z = +0.5)
					-0.5, -0.5,  0.5, 1.0,   // bottom-left
					 0.5, -0.5,  0.5, 1.0,   // bottom-right
					 0.5,  0.5,  0.5, 1.0,   // top-right
					-0.5, -0.5,  0.5, 1.0,   // bottom-left
					 0.5,  0.5,  0.5, 1.0,   // top-right
					-0.5,  0.5,  0.5, 1.0,   // top-left

					// BACK face (z = -0.5)
					 0.5, -0.5, -0.5, 1.0,   // bottom-left
					-0.5, -0.5, -0.5, 1.0,   // bottom-right
					-0.5,  0.5, -0.5, 1.0,   // top-right
					 0.5, -0.5, -0.5, 1.0,   // bottom-left
					-0.5,  0.5, -0.5, 1.0,   // top-right
					 0.5,  0.5, -0.5, 1.0,   // top-left

					// LEFT face (x = -0.5)
					-0.5, -0.5, -0.5, 1.0,   // bottom-left
					-0.5, -0.5,  0.5, 1.0,   // bottom-right
					-0.5,  0.5,  0.5, 1.0,   // top-right
					-0.5, -0.5, -0.5, 1.0,   // bottom-left
					-0.5,  0.5,  0.5, 1.0,   // top-right
					-0.5,  0.5, -0.5, 1.0,   // top-left

					// RIGHT face (x = +0.5)
					 0.5, -0.5,  0.5, 1.0,   // bottom-left
					 0.5, -0.5, -0.5, 1.0,   // bottom-right
					 0.5,  0.5, -0.5, 1.0,   // top-right
					 0.5, -0.5,  0.5, 1.0,   // bottom-left
					 0.5,  0.5, -0.5, 1.0,   // top-right
					 0.5,  0.5,  0.5, 1.0,   // top-left

					// TOP face (y = +0.5)
					-0.5,  0.5,  0.5, 1.0,  // bottom-left
					 0.5,  0.5,  0.5, 1.0,   // bottom-right
					 0.5,  0.5, -0.5, 1.0,   // top-right
					-0.5,  0.5,  0.5, 1.0,   // bottom-left
					-0.5,  0.5, -0.5, 1.0,   // top-right
					 0.5,  0.5, -0.5, 1.0,   // top-left

					// BOTTOM face (y = -0.5)
					-0.5, -0.5, -0.5, 1.0,   // bottom-left
					 0.5, -0.5,  0.5, 1.0,   // bottom-right
					 0.5, -0.5, -0.5, 1.0,   // top-right
					-0.5, -0.5, -0.5, 1.0,   // bottom-left
					-0.5, -0.5,  0.5, 1.0,   // top-right
					 0.5, -0.5,  0.5, 1.0,   // top-left
				],
				color: rgbaToColor(52, 152, 219), // peter river (blue)
			}
		];

		const cubeColors = [
			// FRONT face - orange
			1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0,
			1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0,

			// BACK face - violet
			0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0,
			0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0,

			// LEFT face - green
			0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,
			0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0,

			// RIGHT face - blue
			0.0, 0.3, 1.0, 1.0, 0.0, 0.3, 1.0, 1.0, 0.0, 0.3, 1.0, 1.0,
			0.0, 0.3, 1.0, 1.0, 0.0, 0.3, 1.0, 1.0, 0.0, 0.3, 1.0, 1.0,

			// TOP face - yellow
			1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0,
			1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0,

			// BOTTOM face - red
			1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
			1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0,
		];

		const numOfVertices = 3; // triangle primitive
		const floatsPerVerts = 4; // Vertex constains two floats (x,y).
		const acc = entities.reduce((a, e) => {
			const perVertexColors = Array(e.verts.length / floatsPerVerts)
				.fill(e.color)
				.flat();
			return ({
				vertices: a.vertices.concat(e.verts),
				colors: a.colors.concat(perVertexColors),
				triangleCountTotal: e.triangleCount + a.triangleCountTotal
			})
		},
			{ vertices: <number[]>[], colors: <number[]>[], triangleCountTotal: 0 }
		);

		const posStorageValues = new Float32Array(acc.vertices);
		const posStorageBuffer = device.createBuffer({
			label: `Position storage buffer`,
			size: posStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(posStorageBuffer, 0, posStorageValues);

		const colorStorageValues = new Float32Array(acc.colors);
		const colorStorageBuffer = device.createBuffer({
			label: `Color storage buffer`,
			size: colorStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const cameraUniformBuffer = device.createBuffer({
			size: 4 * 4, // 4 floats, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		// Create one bind group.
		const bindGroup = device.createBindGroup({
			label: `Position only bind group`,
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: posStorageBuffer }, },
				{ binding: 1, resource: { buffer: colorStorageBuffer }, },
				{ binding: 2, resource: { buffer: cameraUniformBuffer }, },
			],
		});

		// Render Loop.

		combineLatest({
			// frame: animationFrames(),
			frame: of(1),
			canvasDimension: canvasDimension$,
			camera: camera$,
		})
			// .pipe(throttleTime(100))
			.subscribe(({ frame, canvasDimension, camera }) => {

				console.log(camera);

			const depthTexture = device.createTexture({
				size: [canvasDimension.width, canvasDimension.height],
				format: "depth24plus",
				usage: GPUTextureUsage.RENDER_ATTACHMENT,
			});
			const renderPassDescriptor: GPURenderPassDescriptor = {
				label: "our basic canvas renderpass",
				colorAttachments: colorAttachments,
				depthStencilAttachment: {
					view: depthTexture.createView(),
					depthClearValue: 1.0,
					depthLoadOp: "clear",
					depthStoreOp: "store"
				}
			};

			colorAttachments[0].view = context!?.getCurrentTexture().createView();

			const encoder = device.createCommandEncoder({ label: "our encoder" });
			const pass = encoder.beginRenderPass(renderPassDescriptor);
			pass.setPipeline(pipeline);

			// Assign here later for write buffer.
			device.queue.writeBuffer(colorStorageBuffer, 0, new Float32Array(cubeColors));

			// Assign here later for write buffer.
			device.queue.writeBuffer(cameraUniformBuffer, 0, new Float32Array(camera));

			// Assign resource
			pass.setBindGroup(0, bindGroup);

			pass.draw(numOfVertices * acc.triangleCountTotal, 1);

			pass.end();
			const commandBuffer = encoder.finish();
			device.queue.submit([commandBuffer]);
		});
	}
}


type Dimension = { width: number, height: number}
type Coord = { x: number, y: number, z: number, w: number }
const transformToClipSpace = (dimension: Dimension) => (coord: Coord): [number, number, number, number] => {
	return [
		((coord.x / dimension.width) * 2 - 1),
		(1 - (coord.y / dimension.height) * 2),
		coord.z,
		coord.w
	];
}
// const normMinMax = (min: number, max: number) => (value: number): number => {
// 	return max - value / (max - min);
// };
const rgbaToColor = (r: number, g: number, b: number, a: number = 1): [number, number, number, number] => {
	return [r / 255, g / 255, b / 255, a / 1];
};


// hard coded resolution.
const resWidth = 2400;
const resHeight = 970
const toCp = transformToClipSpace({ width: resWidth, height: resHeight });

function createQuadVertices(): number[] {
	const coords: Coord[] = [
		// Triangle 1.
		{ x: 0, y: 0, z: 0.3, w: 1 }, // top left
		{ x: 0, y: 100, z: 0.3, w: 1 }, // bottom left
		{ x: 100, y: 100, z: 0.3, w: 1 }, // bottom right
		// Triangle 2.
		{ x: 0, y: 0, z: 0.3, w: 1 }, //  top left
		{ x: 100, y: 100, z: 0.3, w: 1 }, // bottom right
		{ x: 100, y: 0, z: 0.3, w: 1 }, // bottom right
	];
	const coordsCp = coords.map(toCp);
	return coordsCp.flatMap(x => x);
	// why not return simply an array.
}

type Entity = (
	| { kind: "tri" }
	| { kind: "quad" }
	| { kind: "free" })
	// | { kind: "cool-hero" } // 🤣
& { verts: number[], triangleCount: number, color: number[] }
