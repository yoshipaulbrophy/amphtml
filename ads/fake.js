import {validateData, writeScript} from '../3p/3p';

export function fake(global, data){
  const i = global.document.createElement('iframe');
  i.src = data.src;
  const attributes = JSON.parse(this.name).attributes;
  i.name = encodeURI(JSON.stringify(attributes));
  i.height = this.innerHeight;
  i.width = this.innerWidth;
  global.document.getElementById('c').appendChild(i);
}
