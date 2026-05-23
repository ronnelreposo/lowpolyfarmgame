/// <reference types="@webgpu/types" />

import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	NgZone,
} from "@angular/core";
import {
	BehaviorSubject,
	EMPTY,
	fromEvent,
	of,
	scan,
	startWith,
	switchMap,
	tap,
	withLatestFrom,
} from "rxjs";
import * as mat from "@thi.ng/matrices";
import { mapTree, reduceTree } from "./ds/tree";
import {
	Mesh,
	Model,
} from "./models/unit";
import {
	generateTerrain,
	myModelWorld,
} from "./models/scene";
import { toDegrees, toRadians } from "./ds/util";
import { pingPongAngle, easeInOutCubic } from "./helpers/easings";
import { updateWorld, updateWithTrs } from "./models/geom";
import { CommonModule } from "@angular/common";
import * as p from "parsimmon";
import { near, far, viewProjection } from "./rendering";
import { parseOBJ } from "./helpers/obj-parser";

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
					switch (event.key) {
						case "ArrowLeft": return of([-0.1, 0, 0]);
						case "ArrowRight": return of([0.1, 0, 0]);
						case "ArrowUp": return of([0, 0, -0.1]);
						case "ArrowDown": return of([0, 0, 0.1]);
						case "PageUp": return of([0, 0.1, 0.0]);
						case "-": return of([0, 0, 0.1]);
						case "=": return of([0, 0, -0.1]);
						case "PageDown": return of([0, -0.1, 0.0]);
						default: return EMPTY;
					}
				}),
				scan((acc, arr) => [
					Math.min(Math.max(acc[0] + arr[0], -Infinity), Infinity),
					Math.min(Math.max(acc[1] + arr[1], -Infinity), Infinity),
					Math.min(Math.max(acc[2] + arr[2], near), far),
					1,
				], startingCamera),
				startWith(startingCamera),
			)
			.subscribe(c => camera$.next(c));

		const turnAngleDeg = 0;
		const turnAngleDeg$ = new BehaviorSubject(turnAngleDeg);
		fromEvent<KeyboardEvent>(document!, "keydown")
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					const turnRate = 15.0;
					switch (event.key) {
						case "a": return of(-turnRate);
						case "d": return of(turnRate);
						default: return EMPTY;
					}
				}),
				scan((acc, turnRateDelta) => acc + turnRateDelta, turnAngleDeg),
				startWith(turnAngleDeg),
			)
			.subscribe(angle => turnAngleDeg$.next(angle));

		const startingMove = [0, 0, 0, 1];
		const move$ = new BehaviorSubject(startingMove);
		fromEvent<KeyboardEvent>(document!, "keydown")
			.pipe(
				tap((event: KeyboardEvent) => event.preventDefault()),
				switchMap((event: KeyboardEvent) => {
					const strafeSpeed = 0.1;
					switch (event.key) {
						case "w": return of([0, 0, strafeSpeed, 1.0]);
						case "s": return of([0, 0, -strafeSpeed, 1.0]);
						default: return EMPTY;
					}
				}),
				withLatestFrom(turnAngleDeg$),
				scan((acc, [deltaMove, turnAngleDeg]) => {
					const forwardX = Math.sin(toRadians(turnAngleDeg));
					const forwardZ = Math.cos(toRadians(turnAngleDeg));
					const forwardAmount = deltaMove[2];
					return [
						acc[0] + forwardX * forwardAmount,
						0,
						acc[2] + forwardZ * forwardAmount,
						1,
					];
				}, startingMove),
				startWith(startingMove),
			)
			.subscribe(m => move$.next(m));

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
					0.58, 0.64, 0.65, 1
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
					0.58, 0.64, 0.65, 1
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
					0.58, 0.64, 0.65, 1
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
					0.58, 0.64, 0.65, 1
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
			const variantLen = 4;
			const variant = (Math.abs(Math.floor(Math.sin(terrainTrs.t[0] * 12.9898 + terrainTrs.t[2] * 78.233) * 43758.5453)) % variantLen);
			return updateWithTrs(rockScarLookup.get(`rockScar${variant}Model`)!, (trs) => terrainTrs)
		});
		const totalVertexCount = reduceTree(terrain,
			(a, model) => model.mesh.vertexCount + a, 0);
		const modelsTapeLength = totalVertexCount
			* 4
			* 3;

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

		const MAX_BUFF_SIZE = 8 * 1024 * 1024;

		const meshDataStorageBuffer = device.createBuffer({
			label: `Mesh data storage buffer`,
			size: MAX_BUFF_SIZE,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});
		const viewProjectionUniformBuffer = device.createBuffer({
			size: 16 * 4,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		const bindGroup = device.createBindGroup({
			label: `Position only bind group`,
			layout: pipeline.getBindGroupLayout(0),
			entries: [
				{ binding: 0, resource: { buffer: meshDataStorageBuffer } },
				{ binding: 1, resource: { buffer: viewProjectionUniformBuffer } },
			],
		});

		const duration = 1_500;

		let previous = performance.now();
		let lag = 0.0;
		let MsPerUpdate = 1_000 / 60;
		const frame = (now: number) => {
			const elapsed = now - previous;
			previous = now;
			lag += elapsed;

			const period = (now % duration) / duration;

			let animatedModel = undefined;

			const perfStart = performance.now();
			while (lag >= MsPerUpdate) {

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

					const cubermanParser = p.digits.chain(id => p.string(":cuberman"));
					if (cubermanParser.parse(model.id).status) {
						return {
							...model,
							trs: {
								...model.trs,
								rydeg: turnAngleDeg$.value,
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

				lag -= MsPerUpdate;
			}
			const perfEnd = performance.now();
			this.simFPS$.next(perfEnd - perfStart);

			if (animatedModel) {

				const updatedTerrain = updateWorld(terrain);

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

				device.queue.writeBuffer(meshDataStorageBuffer, 0, new Float32Array(models2.tape));

				const viewProjected = viewProjection({
					width: canvasDimension.width,
					height: canvasDimension.height,
					camera: camera$.value,
					initialCameraPosition: startingCamera
				});
				const pvData = new Float32Array(viewProjected);
				device.queue.writeBuffer(viewProjectionUniformBuffer, 0, pvData);

				pass.setBindGroup(0, bindGroup);

				const drawInstances = 1;
				pass.draw(totalVertexCount, drawInstances);

				pass.end();
				const commandBuffer = encoder.finish();
				device.queue.submit([commandBuffer]);
			}
			requestAnimationFrame(frame);
		};
		requestAnimationFrame(frame);
	}
}