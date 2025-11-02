/// <reference types="@webgpu/types" />

import { LOCATION_UPGRADE_CONFIGURATION } from "@angular/common/upgrade";
import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	NgZone,
	OnInit,
} from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
	animationFrames,
	BehaviorSubject,
	combineLatest,
	EMPTY,
	fromEvent,
	map,
	of,
	ReplaySubject,
	scan,
	startWith,
	Subject,
	switchMap,
	tap,
	throttleTime,
} from "rxjs";
import * as mat from "@thi.ng/matrices";
import { mapTree, reduceTree } from "./ds/tree";
import {
	Mesh,
	Model,
	setDebugColors,
	setTerrainColors,
	unitCube,
	Universal,
} from "./models/unit";
import {
	cuberManCount,
	cuberManCubeCount,
	myModelWorld,
	terrainHeight,
	terrainWidth,
} from "./models/puppy";
import { toDegrees } from "./ds/util";
import { updateWorld } from "./models/geom";

@Component({
	selector: "app-root",
	imports: [RouterOutlet],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
	changeDetection: ChangeDetectionStrategy.OnPush,
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

		const startingCamera = [0, 5, 5, 1];
		const camera$ = new BehaviorSubject(startingCamera);
		fromEvent<KeyboardEvent>(document!, "keydown")
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					// console.log("key", event)
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
						Math.min(Math.max(acc[0] + arr[0], -5), 5),
						Math.min(Math.max(acc[1] + arr[1], -5), 5),
						Math.min(Math.max(acc[2] + arr[2], near), far),
						1,
					];
				}, startingCamera),
				startWith(startingCamera),
			)
			.subscribe(camera$);

		const canvasDimension$ = new BehaviorSubject<{
			width: number;
			height: number;
		}>({
			width: canvas!.width,
			height: canvas!.height,
		});
		this.ngZone.runOutsideAngular(async () => {
			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const width = entry.contentBoxSize[0].inlineSize;
					const height = entry.contentBoxSize[0].blockSize;
					const canvas = entry.target as any;
					const newWidth = Math.max(
						1,
						Math.min(width, device.limits.maxTextureDimension2D),
					);
					const newHeight = Math.max(
						1,
						Math.min(height, device.limits.maxTextureDimension2D),
					);
					canvas.width = newWidth;
					canvas.height = newHeight;
					canvasDimension$.next({
						width: newWidth,
						height: newHeight,
					});
				}
			});
			observer.observe(canvas!);
		});
		// const canvasSubj = new
		// canvasDimension$.subscribe()

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
			},
		});
		const colorAttachments: GPURenderPassColorAttachment[] = [
			{
				view: undefined as unknown as GPUTextureView,
				loadOp: "clear",
				storeOp: "store",
				clearValue: { r: 0.3, g: 0.3, b: 0.3, a: 1 },
			},
		];

		const MAX_BUFF_SIZE = 1 * 1024 * 1024; // 1 MB

		const posStorageBuffer = device.createBuffer({
			label: `Position storage buffer`,
			size: MAX_BUFF_SIZE,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const modelsStorageBuffer = device.createBuffer({
			label: `Models storage buffer`,
			size: MAX_BUFF_SIZE,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const modelIdStorageBuffer = device.createBuffer({
			label: `Model IDs storage buffer`,
			size: MAX_BUFF_SIZE,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const colorStorageBuffer = device.createBuffer({
			label: `Color storage buffer`,
			size: MAX_BUFF_SIZE,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const normalStorageBuffer = device.createBuffer({
			label: `Normal storage buffer`,
			size: MAX_BUFF_SIZE,
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
				{ binding: 0, resource: { buffer: posStorageBuffer } },
				{ binding: 1, resource: { buffer: colorStorageBuffer } },
				{ binding: 2, resource: { buffer: normalStorageBuffer } },
				{ binding: 3, resource: { buffer: modelsStorageBuffer } },
				{ binding: 4, resource: { buffer: modelIdStorageBuffer } },
				{ binding: 5, resource: { buffer: cameraUniformBuffer } },
				{ binding: 6, resource: { buffer: aspectUniformBuffer } },
				{ binding: 7, resource: { buffer: timeUniformBuffer } },
			],
		});

		// Render Loop.

		const duration = 1_500;
		const subjects = cuberManCount;
		const terrain = terrainWidth * terrainHeight + 0; // row * col + 1 anchor.
		const cubeNums =
			cuberManCubeCount * subjects +
			terrain +
			0 + // Should match the tree, one for anchor cube, plus terrain.
			8 +
			0; // carrot, 8 cubes, 1 anchor.
		let previous = performance.now();
		let lag = 0.0;
		let MsPerUpdate = 1_000 / 60;
		const frame = (now: number) => {
			const elapsed = now - previous;
			previous = now;
			lag += elapsed;

			// Process Input here.

			// normalized 0→1 value repeating every duration
			const period = (now % duration) / duration;

			const positionValues = new Float32Array(
				cubeNums * Universal.unitCube.vertexFloatCount,
			);
			const colorValues = new Float32Array(
				cubeNums * Universal.unitCube.vertexFloatCount,
			);
			const normalValues = new Float32Array(
				cubeNums * Universal.unitCube.vertexFloatCount,
			);
			const modelIdValues = new Uint32Array(
				cubeNums * Universal.unitCube.numOfVertices,
			);
			let models = undefined;

			while (lag >= MsPerUpdate) {
				let vertexOffset = 0;
				let modelId = 0;
				for (let i = 0; i < cubeNums; i++) {}

				// Set position, color and model id.
				reduceTree(
					myModelWorld,
					(acc, model) => {
						if (model.id === "root-anchor") {
							return acc; // Don't add to the values.
						}

						let coloredCubes: Model = undefined!;
						if (
							model.id.startsWith("carrot-stalk") ||
							model.id.startsWith("carrot-leaf") ||
							model.id.startsWith("carrot-body") ||
							model.id.startsWith("terrain")
						) {
							// Skipped, provided in the Model.
							coloredCubes = model;
						} else {
							// a debug color.
							coloredCubes = setDebugColors(model);
						}
						console.assert(coloredCubes !== undefined);

						positionValues.set(
							coloredCubes.mesh.positions,
							vertexOffset,
						);
						colorValues.set(
							coloredCubes.material.basecolor,
							vertexOffset,
						);
						normalValues.set(
							coloredCubes.mesh.normals,
							vertexOffset,
						);
						modelIdValues.fill(
							modelId,
							vertexOffset / Universal.floatsPerVertex,
							vertexOffset / Universal.floatsPerVertex +
								coloredCubes.mesh.vertexCount,
						);

						vertexOffset += coloredCubes.mesh.positions.length;
						modelId++;
						return acc;
					},
					{},
				);

				// E.g. Turn all the scene graph tree (TARGET)_.
				const animatedModel = mapTree(myModelWorld, (model) => {
					if (model.id === "head-base") {
						return {
							...model,
							trs: {
								...model.trs,
								rzdeg: toDegrees(pingPongAngle(period)),
								rxdeg: toDegrees(pingPongAngle(period)),
							},
						};
					}
					const earPronouncedAngle = 35;
					if (model.id === "left-ear" || model.id === "right-ear") {
						return {
							...model,
							trs: {
								...model.trs,
								rzdeg: toDegrees(
									easeInOutCubic(
										pingPongAngle(
											period,
											earPronouncedAngle,
										),
									),
								),
							},
						};
					}
					if (model.id === "left-leg" || model.id === "right-arm") {
						return {
							...model,
							trs: {
								...model.trs,
								rxdeg: toDegrees(
									-easeInOutCubic(pingPongAngle(period)),
								),
							},
						};
					}
					if (model.id === "right-leg" || model.id === "left-arm") {
						return {
							...model,
							trs: {
								...model.trs,
								rxdeg: toDegrees(
									easeInOutCubic(pingPongAngle(period)),
								),
							},
						};
					}
					if (model.id.startsWith("cuberman")) {
						// get the index. (poormans design)
						const index = +model.id.replace("cuberman:", "");

						return {
							...model,
							trs: {
								...model.trs,
								rydeg: toDegrees(
									easeOutSine(pingPongAngle(period)),
								),
								t: [index - cuberManCount / 2, 1, period], // jump my child.
								// rxdeg: -toDegrees(period * 2 * Math.PI) // tumbling.
							},
						};
					}
					return model;
				});
				models = reduceTree(
					updateWorld(animatedModel), // no need to pass a matrix transform for the whole.
					(acc, trs) => {
						if (trs.id === "root-anchor") {
							return acc;
						}
						return acc.concat(trs.modelMatrix)
					},
					[] as number[],
				);

				// Update lag of the game loop.
				lag -= MsPerUpdate;
			}

			// Render.

			if (models) {
				const canvasDimension = canvasDimension$.value;
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
						depthStoreOp: "store",
					},
				};

				colorAttachments[0].view = context!
					?.getCurrentTexture()
					.createView();

				const encoder = device.createCommandEncoder({
					label: "our encoder",
				});
				const pass = encoder.beginRenderPass(renderPassDescriptor);
				pass.setPipeline(pipeline);

				device.queue.writeBuffer(posStorageBuffer, 0, positionValues);
				device.queue.writeBuffer(colorStorageBuffer, 0, colorValues);
				device.queue.writeBuffer(normalStorageBuffer, 0, normalValues);
				device.queue.writeBuffer(modelsStorageBuffer, 0, new Float32Array(models));
				device.queue.writeBuffer(modelIdStorageBuffer, 0, modelIdValues);
				device.queue.writeBuffer(cameraUniformBuffer, 0, new Float32Array(camera$.value));
				device.queue.writeBuffer(aspectUniformBuffer, 0, new Float32Array([width, height]));
				device.queue.writeBuffer(timeUniformBuffer, 0, new Float32Array([period]));

				// Assign resource
				pass.setBindGroup(0, bindGroup);

				const drawInstances = 1; // Note. Doesn't have to do with the vertices.
				pass.draw(
					cubeNums * Universal.unitCube.numOfVertices,
					drawInstances,
				);

				pass.end();
				const commandBuffer = encoder.finish();
				device.queue.submit([commandBuffer]);
			}
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}
}

type Dimension = { width: number; height: number };
type Coord = { x: number; y: number; z: number; w: number };
const transformToClipSpace =
	(dimension: Dimension) =>
	(coord: Coord): [number, number, number, number] => {
		return [
			(coord.x / dimension.width) * 2 - 1,
			1 - (coord.y / dimension.height) * 2,
			coord.z,
			coord.w,
		];
	};
// const normMinMax = (min: number, max: number) => (value: number): number => {
// 	return max - value / (max - min);
// };

// hard coded resolution.
const resWidth = 2400;
const resHeight = 970;
const toCp = transformToClipSpace({ width: resWidth, height: resHeight });

type Entity = ({ kind: "tri" } | { kind: "quad" } | { kind: "free" }) &
	// | { kind: "cool-hero" } // 🤣
	{ verts: number[]; triangleCount: number; color: number[] };

const fract = (x: number) => x - Math.floor(x);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const deg2rad = (d: number) => (d * Math.PI) / 180;

// ping-pong in [0,1] given any time t (seconds) and frequency (cycles/sec)
function pingPong01(t: number, freq = 1): number {
	const phase = fract(t * freq); // 0..1
	return 1 - Math.abs(1 - 2 * phase); // 0..1..0
}

// angle that goes back & forth between -maxDeg and +maxDeg
function pingPongAngle(t: number, maxDeg = 25, freq = 1): number {
	const w = pingPong01(t, freq); // 0..1..0
	return mix(-deg2rad(maxDeg), deg2rad(maxDeg), w);
}

function easeInOutBack(x: number): number {
	const c1 = 1.70158;
	const c2 = c1 * 1.525;

	return x < 0.5
		? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
		: (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
}

function easeInOutSine(x: number): number {
	return -(Math.cos(Math.PI * x) - 1) / 2;
}
function easeInOutQuad(x: number): number {
	return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function easeOutCubic(x: number): number {
	return 1 - Math.pow(1 - x, 3);
}
function easeInOutCubic(x: number): number {
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutSine(x: number): number {
	return Math.sin((x * Math.PI) / 2);
}

function easeOutBounce(x: number): number {
	const n1 = 7.5625;
	const d1 = 2.75;

	if (x < 1 / d1) {
		return n1 * x * x;
	} else if (x < 2 / d1) {
		return n1 * (x -= 1.5 / d1) * x + 0.75;
	} else if (x < 2.5 / d1) {
		return n1 * (x -= 2.25 / d1) * x + 0.9375;
	} else {
		return n1 * (x -= 2.625 / d1) * x + 0.984375;
	}
}
function easeInBounce(x: number): number {
	return 1 - easeOutBounce(1 - x);
}
