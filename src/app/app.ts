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
import { createLeaf, createNode, filterTree, mapTree, reduceTree, Tree } from "./ds/tree";
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
    chamferedRock2,
	emptyMesh,
	generateTerrain,
	myModelWorld,
} from "./models/scene";
import { rgbaToColor, toDegrees, toRadians } from "./ds/util";
import { fract, mix, deg2rad, pingPong01, pingPongAngle, easeInOutBack, easeInOutSine, easeInOutQuad, easeOutCubic, easeInOutCubic, easeOutSine, easeOutBounce, easeInBounce } from "./helpers/easings";
import { withBounds, updateWorld, summarizeCubeCount, updateWithTrs, summarizeVertexCount } from "./models/geom";
import { CommonModule } from "@angular/common";
import * as vec from "@thi.ng/vectors";
import * as p from "parsimmon";
import { near, far, viewProjection } from "./rendering";
import { Ray, IntersectedModel, selectModels } from "./ds/ray-caster";
import { ParsedObj, parseOBJ } from "./helpers/obj-parser";
// const startingCamera = [0, 15, 10, 1];
const startingCamera = [-10, 10, 10, 1];

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

		console.log("color", rgbaToColor(149, 165, 166));

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
			.subscribe(c => {
				// console.log("Camera updated:", c);
				camera$.next(c);
			});



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

		const rockPerfect = await fetch("/assets/rocks/rock-perfect.obj").then(
			r => r.text().then(s => parseOBJ(s))
		);
		const rockScar1 = await fetch("/assets/rocks/rock-scar1.obj").then(
			r => r.text().then(s => parseOBJ(s))
		);
		const rockScar2 = await fetch("/assets/rocks/rock-scar2.obj").then(
			r => r.text().then(s => parseOBJ(s))
		);
		const rockScar3 = await fetch("/assets/rocks/rock-scar3.obj").then(
			r => r.text().then(s => parseOBJ(s))
		);
		const rockPerfectModel: Model = {
			id: "rockPerfectModel",
			mesh: {
				id: "rockPerfectModel",
				positions: rockPerfect.positions,
				normals: rockPerfect.normals,
				vertexCount: rockPerfect.positions.length / 4,
				triangleCount: 0,
			},
			trs: {
				t: [0, 0, 0],
				pivot: [0, 0, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: 0,
				s: 1,
			},
			modelMatrix: [],
			material: {
				basecolor: Array(rockPerfect.positions.length / 4).fill([
					0.58, 0.64, 0.65, 1 // concrete
				]).flat()
			},
			cubeCount: 0,
			renderable: true,
		};
		const rockScar1Model: Model = {
			id: "rockScar1Model",
			mesh: {
				id: "rockScar1Model",
				positions: rockPerfect.positions,
				normals: rockPerfect.normals,
				vertexCount: rockPerfect.positions.length / 4,
				triangleCount: 0,
			},
			trs: {
				t: [0, 0, 0],
				pivot: [0, 0, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: 0,
				s: 1,
			},
			modelMatrix: [],
			material: {
				basecolor: Array(rockScar1.positions.length / 4).fill([
					0.58, 0.64, 0.65, 1 // concrete
				]).flat()
			},
			cubeCount: 0,
			renderable: true,
		};
		const rockScar2Model: Model = {
			id: "rockScar2Model",
			mesh: {
				id: "rockScar2Model",
				positions: rockScar2.positions,
				normals: rockScar2.normals,
				vertexCount: rockScar2.positions.length / 4,
				triangleCount: 0,
			},
			trs: {
				t: [0, 0, 0],
				pivot: [0, 0, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: 0,
				s: 1,
			},
			modelMatrix: [],
			material: {
				basecolor: Array(rockScar2.positions.length / 4).fill([
					0.58, 0.64, 0.65, 1 // concrete
				]).flat()
			},
			cubeCount: 0,
			renderable: true,
		};
		const rockScar3Model: Model = {
			id: "rockScar3Model",
			mesh: {
				id: "rockScar3Model",
				positions: rockScar3.positions,
				normals: rockScar3.normals,
				vertexCount: rockScar3.positions.length / 4,
				triangleCount: 0,
			},
			trs: {
				t: [0, 0, 0],
				pivot: [0, 0, 0],
				rxdeg: 0,
				rydeg: 0,
				rzdeg: 0,
				s: 1,
			},
			modelMatrix: [],
			material: {
				basecolor: Array(rockScar3.positions.length / 4).fill([
					0.58, 0.64, 0.65, 1 // concrete
				]).flat()
			},
			cubeCount: 0,
			renderable: true,
		};
		const rockScarLookup: Map<string, Model> = new Map([
			["rockScar0Model", rockPerfectModel],
			["rockScar1Model", rockScar1Model],
			["rockScar2Model", rockScar2Model],
			["rockScar3Model", rockScar3Model],
		]);
		const terrain = generateTerrain(0, 13, 13, (terrainTrs) => {
			// Pseudo random. instead of just one variant, let's use the x coords.
			const variantLen = 4;
			const variant = (Math.abs(Math.floor(Math.sin(terrainTrs.t[0] * 12.9898 + terrainTrs.t[2] * 78.233) * 43758.5453)) % variantLen);
			return updateWithTrs(rockScarLookup.get(`rockScar${variant}Model`)!, (trs) => terrainTrs)
		});
		const totalVertexCount = reduceTree(terrain,
			(a, model) => model.mesh.vertexCount + a, 0);
		const modelsTapeLength = totalVertexCount
			* 4 // all parameters stored as vec4, 4 floats.
			* 3; // position, normal, and color

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
				// hits = selectModels(ray$.value, modelOnWorldWithBounds);
				// if (hits.length > 0) {
				// 	console.log("hits", hits.map(hit => hit.modelId));
				// }

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

				const updatedTerrain = updateWorld(terrain);

				// This one first for testing, later summarize all the length.
				const models2 = reduceTree(
					updatedTerrain,
					(acc, model) => {

						let localOffset = acc.offset;

						for (let i = 0; i < model.mesh.vertexCount; i++) {
							const vIndex = i * 4;

							const rawPos = model.mesh.positions.slice(vIndex, vIndex + 4);
							const worldPos = mat.mulV44([], model.modelMatrix, rawPos);
							acc.tape.set(worldPos, localOffset);

							const norm = model.mesh.normals.slice(vIndex, vIndex + 4);
							acc.tape.set(norm, localOffset + 4);

							const color = model.material.basecolor.slice(vIndex, vIndex + 4);
							acc.tape.set(color, localOffset + 8);

							// Step forward 12 floats (4 position + 4 normal + 4 color).
							localOffset += 12;
						}

						return {
							offset: localOffset,
							tape: acc.tape,
						};
					},
					{
						offset: 0,
						tape: new Float32Array(modelsTapeLength),
					}
				);
				// Note. For precision. offset and tepelenth should be equal.


				device.queue.writeBuffer(meshDataStorageBuffer, 0, new Float32Array(models2.tape));
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
					totalVertexCount,
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
