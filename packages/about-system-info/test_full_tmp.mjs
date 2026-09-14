import { cpu, gpu, bench, gpu_bench, cpu_bench_info, gpu_bench_info } from './src/info/hardware.ts';
const context = { cache: {} };
console.log('cpu:', JSON.stringify(cpu(context)));
console.log('gpu:', JSON.stringify(gpu(context)));
console.log('bench:', JSON.stringify(bench(context)));
console.log('gpu_bench:', JSON.stringify(gpu_bench(context)));
