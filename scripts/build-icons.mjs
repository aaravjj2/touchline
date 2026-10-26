import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});try{const svg=await readFile('dist/assets/touchline-icon.svg','utf8');for(const size of [192,512]){const page=await browser.newPage({viewport:{width:size,height:size},deviceScaleFactor:1});await page.setContent('<style>html,body{margin:0;width:100%;height:100%}svg{display:block;width:100%;height:100%}</style>'+svg);await page.screenshot({path:`dist/assets/touchline-${size}.png`});await page.close();}}finally{await browser.close();}
