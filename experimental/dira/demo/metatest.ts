import * as util from 'node:util';
import { getControllerMetadata } from '../src/lib/MetaData/controller-metadata';

const data = getControllerMetadata(__dirname + '/test2.ts');

console.log(util.inspect(data, { depth: null, colors: true }));
