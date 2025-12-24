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
	withLatestFrom,
} from "rxjs";
import * as mat from "@thi.ng/matrices";
import { filterTree, mapTree, reduceTree, Tree } from "./ds/tree";
import {
	flattenedTreeConnections,
	Mesh,
	Model,
	setDebugColors,
	setTerrainColors,
	buildFlattenedIndices,
	unitCube,
	Universal,
    chamferedRock,
} from "./models/unit";
import {
	myModelWorld,
} from "./models/scene";
import { toDegrees, toRadians } from "./ds/util";
import { withBounds, updateWorld, summarizeCubeCount } from "./models/geom";
import { CommonModule } from "@angular/common";
import * as vec from "@thi.ng/vectors";
import * as p from "parsimmon";

// Perspective constants, should match in shader.
const near = 0.1;
const far = 100.0;
const startingCamera = [0, 15, 10, 1];

type Ray = {
	origin: vec.Vec3,
	direction: vec.Vec3
}

@Component({
	selector: "app-root",
	imports: [CommonModule],
	templateUrl: "./app.html",
	styleUrl: "./app.scss",
	changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements AfterViewInit {

	public simFPS$ = new BehaviorSubject(0);

	constructor(private ngZone: NgZone) {}
	async ngAfterViewInit(): Promise<void> {
		const adapter = await navigator.gpu?.requestAdapter();
		const device = await adapter?.requestDevice();

		if (!device) {
			return;
		}
		const canvas = document.querySelector("canvas");

		const camera$ = new BehaviorSubject(startingCamera);
		fromEvent<KeyboardEvent>(document!, "keydown")
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					// console.log("key", event)
					switch (event.key) {
						case "ArrowLeft": {
							return of([-0.1, 0, 0]);
						}
						case "ArrowRight": {
							return of([0.1, 0, 0]);
						}
						case "ArrowUp": {
							return of([0, 0, -0.1]);
						}
						case "ArrowDown": {
							return of([0, 0, 0.1]);
						}
						case "PageUp": {
							return of([0, 0.1, 0.0]);
						}
						case "-": {
							return of([0, 0, 0.1]);
						}
						case "=": {
							return of([0, 0, -0.1]);
						}
						case "PageDown": {
							return of([0, -0.1, 0.0]);
						}
						default:
							return EMPTY;
					}
				}),
				scan((acc, arr) => {

					return [
						Math.min(Math.max(acc[0] + arr[0], -Infinity), Infinity),
						Math.min(Math.max(acc[1] + arr[1], -Infinity), Infinity),
						Math.min(Math.max(acc[2] + arr[2], near), far),
						1,
					];
				}, startingCamera),
				startWith(startingCamera),
			)
			.subscribe(camera$);



		const turnAngleDeg = 0;
		const turnAngleDeg$ = new BehaviorSubject(turnAngleDeg);
		fromEvent<KeyboardEvent>(document!, "keydown")
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					// console.log("key", event)
					const turnRate = 15.0
					switch (event.key) {
						case "a": {
							return of(-turnRate);
						}
						case "d": {
							return of(turnRate);
						}
						default:
							return EMPTY;
					}
				}),
				scan((acc, turnRateDelta) => acc + turnRateDelta, turnAngleDeg),
				startWith(turnAngleDeg),
			)
			.subscribe(angle => {
				turnAngleDeg$.next(angle);
			});

		const startingMove = [0, 0, 0, 1];
		const move$ = new BehaviorSubject(startingMove);
		// Move with respect to the turn.
		fromEvent<KeyboardEvent>(document!, "keydown")
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					// console.log("key", event)
					const strafeSpeed = 0.1;
					switch (event.key) {
						case "w": {
							return of([0, 0, strafeSpeed, 1.0]);
						}
						case "s": {
							return of([0, 0, -strafeSpeed, 1.0]);
						}
						default:
							return EMPTY;
					}
				}),
				withLatestFrom(turnAngleDeg$),
				scan((acc, [deltaMove, turnAngleDeg]) => {
					const forwardX = Math.sin(toRadians(turnAngleDeg));
					const forwardZ = Math.cos(toRadians(turnAngleDeg));
					const forwardAmount = deltaMove[2]; // from W/S
					return [
						acc[0] + forwardX * forwardAmount,
						0,
						acc[2] + forwardZ * forwardAmount,
						1,
					];
				}, startingMove),
				startWith(startingMove),
			)
			.subscribe(m => {
				move$.next(m);
			});

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

		const ray$ = new BehaviorSubject<Ray>({ direction: vec.vec3(0, 0, 0), origin: vec.vec3(0, 0, 0) });
		// canvas pixel coords
		fromEvent(canvas!, 'pointerdown')
			.pipe(withLatestFrom(canvasDimension$, camera$))
			.subscribe(([e, { width, height }, camera]) => {
				// In full screen, use bounding rect if not.
				const x = (e as PointerEvent).clientX;
				const y = (e as PointerEvent).clientY;

				// Note for PV. This is duplicated logic from shader.
				const viewProjected = viewProjection({
					width,
					height,
					camera,
					initialCameraPosition: startingCamera
				});

				const invPV = mat.invert44([], viewProjected);

				// screen (pixel) -> NDC
				const ndcX = (x / width) * 2.0 - 1.0;
				const ndcY = 1.0 - (y / height) * 2.0;

				const clipNear = [ndcX, ndcY, 0.0, 1.0];
				const clipFar = [ndcX, ndcY, 1.0, 1.0];

				if (invPV) {
					// Backprojection/Unproject: world = inverse(P*V) * clip.
					const worldNear4 = mat.mulV44([], invPV, clipNear);
					const worldFar4 = mat.mulV44([], invPV, clipFar);

					// Find out more about homogenous coords.
					const worldNear = [
						worldNear4[0] / worldNear4[3],
						worldNear4[1] / worldNear4[3],
						worldNear4[2] / worldNear4[3]
					];

					// Find out more about homogenous coords.
					const worldFar = [
						worldFar4[0] / worldFar4[3],
						worldFar4[1] / worldFar4[3],
						worldFar4[2] / worldFar4[3]
					];

					const rayOrigin = worldNear;
					const rayDirectionRaw = mat.sub([], worldFar, rayOrigin);
					const rayDirection = vec.normalize3([], rayDirectionRaw);


					const ray = {
						origin: vec.vec3(...rayOrigin),
						direction: vec.vec3(...rayDirection),
					};
					ray$.next(ray);
				}
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
		const sampleCount = 4;
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
			multisample: {
				count: sampleCount
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

		const MAX_BUFF_SIZE = 8 * 1024 * 1024; // 8 MB

		const meshDataStorageBuffer = device.createBuffer({
			label: `Mesh data storage buffer`,
			size: MAX_BUFF_SIZE,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		// const posStorageBuffer = device.createBuffer({
		// 	label: `Position storage buffer`,
		// 	size: MAX_BUFF_SIZE,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		// });

		// const modelsStorageBuffer = device.createBuffer({
		// 	label: `Models storage buffer`,
		// 	size: MAX_BUFF_SIZE,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		// });

		// const modelIdStorageBuffer = device.createBuffer({
		// 	label: `Model IDs storage buffer`,
		// 	size: MAX_BUFF_SIZE,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		// });

		// const colorStorageBuffer = device.createBuffer({
		// 	label: `Color storage buffer`,
		// 	size: MAX_BUFF_SIZE,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		// });

		// const normalStorageBuffer = device.createBuffer({
		// 	label: `Normal storage buffer`,
		// 	size: MAX_BUFF_SIZE,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		// });

		// const timeUniformBuffer = device.createBuffer({
		// 	size: 1 * 4, // 1 float, 4 bytes each.
		// 	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		// });
		// const subjUniformBuffer = device.createBuffer({
		// 	size: 4 * 4, // 1 float, 4 bytes each.
		// 	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		// });
		// const cubeCountUniformBuffer = device.createBuffer({
		// 	size: 1 * 4, // 1 float, 4 bytes each.
		// 	usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		// });
		const viewProjectionUniformBuffer = device.createBuffer({
			size: 16 * 4, // 4x4 matrix, 4 bytes each.
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		// const aabbminsStorageBuffer = device.createBuffer({
		// 	label: "aabbminsStorageBuffer",
		// 	size: MAX_BUFF_SIZE,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		// });
		// const aabbmaxsStorageBuffer = device.createBuffer({
		// 	label: "aabbmaxsStorageBuffer",
		// 	size: MAX_BUFF_SIZE,
		// 	usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		// });

		// Create one bind group.
		const bindGroup = device.createBindGroup({
			label: `Position only bind group`,
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: meshDataStorageBuffer } },
				// { binding: 1, resource: { buffer: colorStorageBuffer } },
				// { binding: 2, resource: { buffer: normalStorageBuffer } },
				// { binding: 3, resource: { buffer: modelsStorageBuffer } },
				// { binding: 4, resource: { buffer: modelIdStorageBuffer } },
				// { binding: 5, resource: { buffer: timeUniformBuffer } },
				// { binding: 6, resource: { buffer: cubeCountUniformBuffer } },
				{ binding: 1, resource: { buffer: viewProjectionUniformBuffer } },
				// { binding: 8, resource: { buffer: aabbminsStorageBuffer } },
				// { binding: 9, resource: { buffer: aabbmaxsStorageBuffer } },
			],
		});

		// TODO. Upload to GPU.
		const flattenedRelationships = flattenedTreeConnections(myModelWorld);
		const modelIndexLookup = new Map(flattenedRelationships.map((m, i) => [m.modelId, i]));
		const flattenedIndices = flattenedRelationships.map(d => buildFlattenedIndices(d, modelIndexLookup));
		console.log(flattenedRelationships, modelIndexLookup, flattenedIndices);

		// Render Loop.

		const duration = 1_500;

		let previous = performance.now();
		let lag = 0.0;
		let MsPerUpdate = 1_000 / 60;
		let hits: IntersectedModel[] = [];
		const frame = (now: number) => {
			hits = [];
			const elapsed = now - previous;
			previous = now;
			lag += elapsed;

			// Process Input here.

			// normalized 0→1 value repeating every duration
			const period = (now % duration) / duration;


			let animatedModel = undefined;

			const perfStart = performance.now();
			while (lag >= MsPerUpdate) {

				// E.g. Turn all the scene graph tree (TARGET)_.
				animatedModel = mapTree(myModelWorld, (model) => {

					if (model.id.includes("cuberman:head")) {
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
					if (model.id.includes("cuberman:head:left-ear") ||
						model.id.includes("cuberman:head:right-ear")) {
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
					if (model.id.includes("cuberman:head:left-leg") ||
						model.id.includes("cuberman:head:right-arm")) {
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
					if (model.id.includes("cuberman:head:right-leg") ||
						model.id.includes("cuberman:head:left-arm")) {
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

					// For improvement. Performance on parsing.
					const cubermanParser = p.digits.chain(id => p.string(":cuberman"));
					if (cubermanParser.parse(model.id).status) {
						return {
							...model,
							trs: {
								...model.trs,
								rydeg: turnAngleDeg$.value, // rotate only on Y axis.
								t: [
									move$.value[0],
									model.trs.t[1],
									move$.value[2],
									model.trs.t[3]
								],
							}
						};
					}
					return model;
				});

				// Update lag of the game loop.
				lag -= MsPerUpdate;
			}
			const perfEnd = performance.now();
			this.simFPS$.next(perfEnd - perfStart);

			// Render.

			if (animatedModel) {

				const modelOffset = 16; // 4*4 matrix.
				const aabbStride = 4; // 4 floats. 3dcoords + 1 padding.

				const modelOnWorldWithBounds = withBounds(updateWorld(animatedModel));
				hits = selectModels(ray$.value, modelOnWorldWithBounds);
				if (hits.length > 0) {
					console.log("hits", hits.map(hit => hit.modelId));
				}

				const filteredModels = filterTree(modelOnWorldWithBounds, model =>
					!(model.id === hits.sort((a, b) => a.minDistance - b.minDistance)[0]?.modelId));

				// Skip this frame.
				if (filteredModels === null) {
					requestAnimationFrame(frame);
					return;
				}
				const finalModels = summarizeCubeCount(filteredModels);
				const cubeNums =  finalModels.value.cubeCount;

				// Reduce everything before rendering.
				const models = reduceTree(
					finalModels,
					(acc, model) => {

						console.assert(model !== undefined);

						acc.positionValues.set(
							model.mesh.positions,
							acc.vertexOffset,
						);
						acc.colorValues.set(
							model.material.basecolor,
							acc.vertexOffset,
						);
						acc.normalValues.set(
							model.mesh.normals,
							acc.vertexOffset,
						);
						acc.modelIdValues.fill(
							acc.modelId,
							acc.vertexOffset / Universal.floatsPerVertex,
							acc.vertexOffset / Universal.floatsPerVertex +
								model.mesh.vertexCount,
						);
						acc.modelMatrices.set(model.modelMatrix, acc.modelOffset);
						acc.aabbMins.set([...model.aabbMin!, 1], acc.aabbOffset);
						acc.aabbMaxs.set([...model.aabbMax!, 1], acc.aabbOffset);

						return {
							vertexOffset: acc.vertexOffset + model.mesh.positions.length,
							modelId: acc.modelId + 1,
							modelOffset: acc.modelOffset + modelOffset,
							aabbOffset: acc.aabbOffset + aabbStride,

							positionValues: acc.positionValues,
							colorValues: acc.colorValues,
							normalValues: acc.normalValues,
							modelIdValues: acc.modelIdValues,
							modelMatrices: acc.modelMatrices,
							aabbMins: acc.aabbMins,
							aabbMaxs: acc.aabbMaxs,
						}
					},
					{
						// Incremental informations.
						vertexOffset: 0,
						modelId: 0,
						modelOffset: 0,
						aabbOffset: 0,

						// Values.
						positionValues: new Float32Array(
							cubeNums * Universal.unitCube.vertexFloatCount,
						),
						colorValues: new Float32Array(
							cubeNums * Universal.unitCube.vertexFloatCount,
						),
						normalValues: new Float32Array(
							cubeNums * Universal.unitCube.vertexFloatCount,
						),
						modelIdValues: new Uint32Array(
							cubeNums * Universal.unitCube.numOfVertices,
						),
						modelMatrices: new Float32Array(
							cubeNums * modelOffset,
						),
						aabbMins: new Float32Array(
							cubeNums * aabbStride
						),
						aabbMaxs: new Float32Array(
							cubeNums * aabbStride
						),
					}
				);

				const canvasDimension = canvasDimension$.value;
				const depthTexture = device.createTexture({
					size: [canvasDimension.width, canvasDimension.height],
					format: "depth24plus",
					sampleCount,
					usage: GPUTextureUsage.RENDER_ATTACHMENT,
				});
				const msaaTex = device.createTexture({
					label: "our msaa tex",
					size: [canvasDimension.width, canvasDimension.height],
					format: presentationFormat,
					sampleCount,
					usage: GPUTextureUsage.RENDER_ATTACHMENT
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

				colorAttachments[0].view = msaaTex.createView();
				colorAttachments[0].resolveTarget = context!.getCurrentTexture().createView();

				const encoder = device.createCommandEncoder({
					label: "our encoder",
				});
				const pass = encoder.beginRenderPass(renderPassDescriptor);
				pass.setPipeline(pipeline);

				const singleMeshTriangle = new Float32Array([
					// VERTEX 0 (Left-Back)
					-0.5, 0.0, -0.5, 1.0,  // Position (x, y, z, w)
					0.0, 1.0, 0.0, 0.0,  // Normal (Up)
					1.0, 0.0, 0.0, 1.0,  // Color (Red)

					// VERTEX 1 (Right-Back)
					0.5, 0.0, -0.5, 1.0,  // Position
					0.0, 1.0, 0.0, 0.0,  // Normal
					1.0, 0.0, 0.0, 1.0,  // Color

					// VERTEX 2 (Front-Center)
					0.0, 0.0, 0.5, 1.0,  // Position
					0.0, 1.0, 0.0, 0.0,  // Normal
					1.0, 0.0, 0.0, 1.0,  // Color
				]);
				const vertexCount = 99;
				// later add aabbmin and aabbmax.

				const myRock = chamferedRock();
				device.queue.writeBuffer(meshDataStorageBuffer, 0, new Float32Array(myRock.data));
				// device.queue.writeBuffer(colorStorageBuffer, 0, models.colorValues);
				// device.queue.writeBuffer(normalStorageBuffer, 0, models.normalValues);
				// device.queue.writeBuffer(modelsStorageBuffer, 0, models.modelMatrices);
				// device.queue.writeBuffer(modelIdStorageBuffer, 0, models.modelIdValues);
				// device.queue.writeBuffer(timeUniformBuffer, 0, new Float32Array([period]));
				// device.queue.writeBuffer(subjUniformBuffer, 0, new Float32Array([0, 0, 0, 1]));
				// device.queue.writeBuffer(cubeCountUniformBuffer, 0, new Uint32Array([cubeNums]));
				// device.queue.writeBuffer(aabbminsStorageBuffer, 0, models.aabbMins);
				// device.queue.writeBuffer(aabbmaxsStorageBuffer, 0, models.aabbMaxs);

				const viewProjected = viewProjection({
					width: canvasDimension.width,
					height: canvasDimension.height,
					camera: camera$.value,
					initialCameraPosition: startingCamera
				});
				const pvData = new Float32Array(viewProjected);
				// console.log(viewProjected);
				device.queue.writeBuffer(viewProjectionUniformBuffer, 0, pvData);

				// Assign resource
				pass.setBindGroup(0, bindGroup);

				const drawInstances = 1; // Note. Doesn't have to do with the vertices.
				pass.draw(
					myRock.vertexCount,
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

function viewProjection(params: { width: number, height: number, camera: number[], initialCameraPosition: number[] }): number[] {
	const fovDegrees = 60;
	const aspect = params.width / params.height;

	const P = mat.perspective([], fovDegrees, aspect, near, far);

	const eye = [params.camera[0], params.camera[1], params.camera[2]];
	// const subj = [
	// 	params.camera[0] - params.initialCameraPosition[0],
	// 	params.camera[1] - params.initialCameraPosition[1],
	// 	params.camera[2] - params.initialCameraPosition[2]];
	const subj = [0, 0, 0];
	const up = [0, 1, 0];
	const V = mat.lookAt([], eye, subj, up);

	return mat.mulM44([], P, V) as number[];
}

type RayHit = {
	distance: number;
	model: Model;
}
// Standard "Slab Method" for Ray vs AABB
export function intersectRayAabb(
	rayOrigin: number[],
	rayDir: number[],
	boxMin: number[],
	boxMax: number[]
): number | null {
	// tMin is the distance to enter the intersection volume
	// tMax is the distance to exit the intersection volume
	let tMin = 0.0;
	let tMax = Infinity;

	for (let i = 0; i < 3; i++) {
		// 1.0 / dir checks for parallel rays automatically due to IEEE 754 Infinity
		const invD = 1.0 / rayDir[i];

		let t0 = (boxMin[i] - rayOrigin[i]) * invD;
		let t1 = (boxMax[i] - rayOrigin[i]) * invD;

		// If the ray is coming from the negative direction, swap entry/exit
		if (invD < 0.0) {
			const temp = t0;
			t0 = t1;
			t1 = temp;
		}

		// Narrow down the intersection window
		tMin = t0 > tMin ? t0 : tMin;
		tMax = t1 < tMax ? t1 : tMax;

		// If the exit is behind the entry, we missed
		if (tMax <= tMin) return null;
	}

	return tMin;
}


type IntersectedModel = { modelId: Model["id"], minDistance: number }
function selectModel(ray: Ray, worldTree: Tree<Model>): IntersectedModel | undefined {
	switch (worldTree.kind) {
		case "leaf": {
			const model = worldTree.value;
			const hit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				model.aabbMin as number[],
				model.aabbMax as number[]
			);
			if (!hit) { return undefined; }
			return { modelId: model.id, minDistance: hit };
		}
		case "node": {
			const groupModel = worldTree.value;
			const groupHit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				groupModel.aabbMin as number[],
				groupModel.aabbMax as number[]
			);
			// Group didn't hit, return immediately.
			if (!groupHit) {
				return undefined;
			}
			// Alternative. Map → Filter → Sort → Head (or some bias.)
			let closestHit: IntersectedModel | undefined;
			for (const child of worldTree.children) {
				const childResult = selectModel(ray, child);
				// console.log(childResult);
				if (childResult) {
					if (!closestHit || childResult.minDistance < closestHit.minDistance) {
						closestHit = childResult;
					}
				}
			}
			return closestHit;
		}
	}
}

function selectModels(ray: Ray, worldTree: Tree<Model>, selectEntireModel = true): IntersectedModel[] {
	switch (worldTree.kind) {
		case "leaf": {
			const model = worldTree.value;
			const hit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				model.aabbMin as number[],
				model.aabbMax as number[]
			);
			if (!hit) { return []; }
			return [{ modelId: model.id, minDistance: hit }];
		}
		case "node": {
			const groupModel = worldTree.value;
			const groupHit = intersectRayAabb(
				ray.origin.buf as number[],
				ray.direction.buf as number[],
				groupModel.aabbMin as number[],
				groupModel.aabbMax as number[]
			);
			// Group didn't hit, return immediately.
			if (!groupHit) {
				return [];
			}
			const selectedChildrenModels = worldTree.children.flatMap(child => selectModels(ray, child));
			if (!groupModel.renderable) {
				return selectedChildrenModels;
			}
			return [
				{ modelId: groupModel.id, minDistance: groupHit },
				...selectedChildrenModels
			];
		}
	}
}

// top edges are sliced.
function cuberock1() {
	// Front face.
	const cubeCorners = [
		// FRONT face (z = +0.5)
		-0.5, -0.5, +0.5, 1.0,   // bottom-left
		+0.5, -0.5, +0.5, 1.0,   // bottom-right
		+0.5, +0.5, +0.5, 1.0,   // top-right
		-0.5, -0.5, +0.5, 1.0,   // bottom-left
		+0.5, +0.5, +0.5, 1.0,   // top-right
		-0.5, +0.5, +0.5, 1.0,   // top-left
	];
}
