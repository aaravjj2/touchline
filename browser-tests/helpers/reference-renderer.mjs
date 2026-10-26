// The ordinary CI default remains unchanged. A documented Windows timing run
// can explicitly select the installed hardware adapter instead of SwiftShader.
// No frame threshold or gameplay assertion changes with this option.
export function referenceRendererOptions(){
 if(!process.env.TOUCHLINE_TEST_ANGLE)return {};
 if(process.platform!=='win32'||process.env.TOUCHLINE_TEST_ANGLE!=='d3d11')throw Error('TOUCHLINE_TEST_ANGLE supports d3d11 on Windows only.');
 return {args:['--use-angle=d3d11']};
}
