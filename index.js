const fs = require('fs');
const fse = require('fs-extra');
const template = require('./template/template');
const util = require('./util.js');
const path = require('path');
const StyleStore = require('./store/StyleStore');
const layerParser = require('./parser/layerParser');
const styleRender = require('./render/styleRender');
const htmlRender = require('./render/htmlRender');

const { exec } = require('child_process');
var outPages = [];


const handleArtBoard = (layer, pageName) => {
    if (layer.type == 'artboard') {
        StyleStore.reset();
        styleRender(layer, null, '../');
        var html = htmlRender(layer, null, '../');
        html = template(html, layer);
        fse.outputFile(`./output/html/${pageName}/artboard-${layer.name}.html`, html, e => { });
        fse.outputFile(`./output/html/${pageName}/artboard-${layer.name}.css`, StyleStore.toString(), (e) => { });
        outPages.push({
            name: layer.name,
            url: `./${pageName}/artboard-${layer.name}.html`
        });
    } else {
        layer.childrens && layer.childrens.forEach((child) => {
            handleArtBoard(child, pageName);
        });
    }
};

module.exports = function(source){
    // 解压 sketch 文件
    exec(`rm -rf output/*;unzip -o ${source} -d output;`, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        // 复制图片到结果文件夹
        fse.copy('./output/images', './output/html/images', err => { });
        fse.copy('./template/index.html', './output/html/index.html', err => { });
        // 对所有页面进行通用组件提取
        let files = fs.readdirSync('./output/pages');
        let fileStore = {};
        files.forEach((f) => {
            fileStore[f] = JSON.parse(fs.readFileSync('./output/pages/' + f).toString());
        });
        outPages = [];
        outResults = [];
        // 对每个页面进行处理解析
        files.forEach((f, i) => {
            let data = fileStore[f];
            let result = layerParser(data);
            outResults.push(result);
        });
        outResults.forEach((result) => {
            if (result.type === 'page') {
                handleArtBoard(result, `page-${result.name}`);
            }
        });
        fse.outputFile('./output/html/index.js', (() => {
            let r = '';
            outPages.forEach((p) => {
                r += `addTab('${p.url}','${p.name}');`;
            });
            return r;
        })(), e => {

        });

        exec(`open -a "/Applications/Google Chrome.app" "${__dirname + '/output/html/index.html'}"`);

    });
}


