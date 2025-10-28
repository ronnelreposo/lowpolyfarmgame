/// <reference types="@webgpu/types" />

import { LOCATION_UPGRADE_CONFIGURATION } from "@angular/common/upgrade";
import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { animationFrames, BehaviorSubject, combineLatest, EMPTY, fromEvent, map, of, ReplaySubject, scan, startWith, Subject, switchMap, tap, throttleTime } from "rxjs";
import * as mat from "@thi.ng/matrices";
import { mapTree, reduceTree } from "./ds/tree";
import { Mesh, unitCube } from "./models/unit";
import { head_unit, myRobot, puppy, updateWorld } from "./models/puppy";
import { toDegrees } from "./ds/util";

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

		const startingCamera = [0, 0, 5, 1];
		const camera$ = fromEvent<KeyboardEvent>(document!, 'keydown')
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					console.log("key", event)
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
						case "-": {
							return of([0, 0, 0.1]);
						}
						case "=": {
							return of([0, 0, -0.1]);
						}
						case "PageDown": {
							return of([0, 0, -0.1]);
						}
						default:
							return EMPTY;
					}
				}),
				scan((acc, arr) => {
					// Pßerspective constants, should match in shader.
					const near = 0.1;
					const far = 100;
					return [
						Math.min(Math.max(acc[0] + arr[0], -1), 1),
						Math.min(Math.max(acc[1] + arr[1], -1), 1),
						Math.min(Math.max(acc[2] + arr[2], near), far),
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

		// // Transform: Final transform - Move to local space.
		// const finalLocalTransform = mapTree<Mesh, Mesh>(head_unit, (cube) => {
		// 	const T = mat.translation44([], [0.0, 0.0, 0.0]); // identity for now.
		// 	const Rx = mat.rotationX44([], 0);
		// 	const Ry = mat.rotationY44([], 0);
		// 	const Rz = mat.rotationZ44([], 0);
		// 	const R = mat.mulM44([], Rz, mat.mulM44([], Ry, Rx));
		// 	const S = mat.scale44([], 1);
		// 	// M = T * Rx * Ry * Rz * S
		// 	const M = mat.mulM44([], T, mat.mulM44([], R, S));

		// 	// choose one:
		// 	// Local-space add:
		// 	// return mat.mulM44([], cube.model, M);

		// 	// World-space add:
		// 	const newModel = mat.mulM44([], M, cube.worldMatrix);

		// 	return <Mesh>{
		// 		...cube,
		// 		worldMatrix: newModel,
		// 	};
		// });

		const floatsPerPosition = 4; // vec4f positions.
		// const foldedSceneGraph = reduceTree(
		// 	finalLocalTransform,
		// 	(acc, val) => {
		// 		const vertexCount = Math.floor(val.vertices.length / floatsPerPosition);
		// 		const idsForThisObject = Array(vertexCount).fill(acc.modelIdIncrement);
		// 		// Revisit performance.
		// 		return {
		// 			verticesArray: [...acc.verticesArray, ...val.vertices],
		// 			colorsArray: [...acc.colorsArray, ...val.colors],
		// 			// modelsArray: [...acc.modelsArray, ...val.worldMatrix],
		// 			modelIdIncrement: acc.modelIdIncrement + 1,
		// 			modelIdArray: [...acc.modelIdArray, ...idsForThisObject],
		// 			cubeCount: acc.cubeCount + 1
		// 		};
		// 	},
		// 	{
		// 		verticesArray: [] as number[],
		// 		colorsArray: [] as number[],
		// 		// modelsArray: [] as number[],
		// 		modelIdIncrement: 0,
		// 		modelIdArray: [] as number[],
		// 		cubeCount: 0
		// 	}
		// );

		// simplified for now, we could use tree later combining Mesh & Geometry
		// const pos_xs = [
		// 	unitCube("1").vertices,
		// 	unitCube("2").vertices,
		// 	unitCube("3").vertices,
		// ];

		// lazy version. put it on a tree along side with geometry.
		// fudge (delete) the baselocal, local and world.
		const reduced_result = [
			unitCube("1"),
			unitCube("2"),
			unitCube("3"),
		]
		.reduce((acc, c) => {
			const vertexCount = Math.floor(c.vertices.length / floatsPerPosition);
			const idsForThisObject = Array(vertexCount).fill(acc.modelIdIncrement);
			return {
				verticesArray: [...acc.verticesArray, ...c.vertices],
				colorsArray: [...acc.colorsArray, ...c.colors],
				modelIdIncrement: acc.modelIdIncrement + 1,
				modelIdArray: [...acc.modelIdArray, ...idsForThisObject],
				cubeCount: acc.cubeCount + 1
			};
		},
		{
			verticesArray: [] as number[],
			colorsArray: [] as number[],
			// modelsArray: [] as number[],
			modelIdIncrement: 0,
			modelIdArray: [] as number[],
			cubeCount: 0
		});
		const xs = reduceTree(
			updateWorld(myRobot, mat.rotationZ44([], 25) as number[]),
			(acc, trs) => acc.concat(trs.worldMatrix), [] as number[]);


		console.log(reduced_result.modelIdArray);

		const numOfVertices = 3; // Triangle primitive
		const cubeFaces = 6;
		const trianglePerFace = 2;
		const unitCubeNumOfVertices = numOfVertices * cubeFaces * trianglePerFace;

		const posStorageValues = new Float32Array(reduced_result.verticesArray);
		const posStorageBuffer = device.createBuffer({
			label: `Position storage buffer`,
			size: posStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		device.queue.writeBuffer(posStorageBuffer, 0, posStorageValues);

		const modelsStorageValues = new Float32Array(xs);
		const modelsStorageBuffer = device.createBuffer({
			label: `Models storage buffer`,
			size: modelsStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const modelIdStorageValues = new Uint32Array(reduced_result.modelIdArray);
		const modelIdStorageBuffer = device.createBuffer({
			label: `Model IDs storage buffer`,
			size: modelIdStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const colorStorageValues = new Float32Array(reduced_result.colorsArray);
		const colorStorageBuffer = device.createBuffer({
			label: `Color storage buffer`,
			size: colorStorageValues.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const cameraUniformBuffer = device.createBuffer({
			size: 4 * 4, // 4 floats, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const aspectUniformBuffer = device.createBuffer({
			size: 4 * 4, // 4 floats, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const timeUniformBuffer = device.createBuffer({
			size: 1 * 4, // 1 float, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		// Create one bind group.
		const bindGroup = device.createBindGroup({
			label: `Position only bind group`,
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: posStorageBuffer }, },
				{ binding: 1, resource: { buffer: colorStorageBuffer }, },
				{ binding: 2, resource: { buffer: modelsStorageBuffer }, },
				{ binding: 3, resource: { buffer: modelIdStorageBuffer }, },
				{ binding: 4, resource: { buffer: cameraUniformBuffer }, },
				{ binding: 5, resource: { buffer: aspectUniformBuffer }, },
				{ binding: 6, resource: { buffer: timeUniformBuffer }, },
			],
		});

		// Render Loop.

		combineLatest({
			frame: animationFrames(),
			// frame: of({ timestamp: 0 }),
			canvasDimension: canvasDimension$,
			camera: camera$,
		})
			.subscribe(({ frame, canvasDimension, camera }) => {

				// console.log(camera);

				const duration = 1_500;
				const period = (frame.timestamp % duration) / duration;

				const width = canvasDimension.width;
				const height = canvasDimension.height;
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
				device.queue.writeBuffer(colorStorageBuffer, 0, new Float32Array(reduced_result.colorsArray));

				// E.g. Turn all the scene graph tree.
				const trs = mat.rotationZ44([], pingPongAngle(period)) as number[]; // Just a shortcut.
				const xs = reduceTree(
					updateWorld(myRobot, trs),
					(acc, trs) => acc.concat(trs.worldMatrix), [] as number[]);

				// // E.g. Turn all the scene graph tree (TARGET)_.
				// const targetLeftEar = mapTree(myRobot, trs => {
				// 	if (trs.id === "left-ear") {
				// 		return { ...trs, rzdeg: toDegrees(pingPongAngle(0)) }
				// 	}
				// 	return trs;
				// })
				// const xs = reduceTree(
				// 	updateWorld(targetLeftEar), // no need to pass a matrix transform for the whole.
				// 	(acc, trs) => acc.concat(trs.worldMatrix), [] as number[]);

				// Assign here later for write buffer.
				device.queue.writeBuffer(modelsStorageBuffer, 0, new Float32Array(xs));

				// Assign here later for write buffer.
				device.queue.writeBuffer(modelIdStorageBuffer, 0, modelIdStorageValues);

				// Assign here later for write buffer.
				device.queue.writeBuffer(cameraUniformBuffer, 0, new Float32Array(camera));

				// Assign here later for write buffer.
				device.queue.writeBuffer(aspectUniformBuffer, 0, new Float32Array([width, height]));

				// Assign here later for write buffer.
				device.queue.writeBuffer(timeUniformBuffer, 0, new Float32Array([period]));

				// Assign resource
				pass.setBindGroup(0, bindGroup);

				const drawInstances = 1; // Note. Doesn't have to do with the vertices.
				pass.draw(reduced_result.cubeCount * unitCubeNumOfVertices, drawInstances);

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

// hard coded resolution.
const resWidth = 2400;
const resHeight = 970
const toCp = transformToClipSpace({ width: resWidth, height: resHeight });

type Entity = (
	| { kind: "tri" }
	| { kind: "quad" }
	| { kind: "free" })
	// | { kind: "cool-hero" } // 🤣
& { verts: number[], triangleCount: number, color: number[] }




const fract = (x: number) => x - Math.floor(x);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const deg2rad = (d: number) => (d * Math.PI) / 180;

// ping-pong in [0,1] given any time t (seconds) and frequency (cycles/sec)
function pingPong01(t: number, freq = 1): number {
  const phase = fract(t * freq);           // 0..1
  return 1 - Math.abs(1 - 2 * phase);      // 0..1..0
}

// angle that goes back & forth between -maxDeg and +maxDeg
function pingPongAngle(t: number, maxDeg = 25, freq = 1): number {
  const w = pingPong01(t, freq);           // 0..1..0
  return mix(-deg2rad(maxDeg), deg2rad(maxDeg), w);
}
