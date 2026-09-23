/* Servidor local do app "Projetos & Produtos".
   O navegador so libera o banco de dados (IndexedDB) para paginas servidas
   por http://, por isso o app precisa ser aberto por aqui e nao com dois
   cliques no index.html. */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const raiz = __dirname;
const abrirNavegador = !process.argv.includes('--sem-navegador');
const PORTA_INICIAL = 8099;
const PORTA_MAXIMA = 8119;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.prjz': 'application/zip',
  '.zip': 'application/zip',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function atender(req, res){
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if(rel === '/') rel = '/index.html';

  // impede sair da pasta do app
  const destino = path.join(raiz, path.normalize(rel).replace(/^([\\/])+/, ''));
  if(!destino.startsWith(raiz)){
    res.writeHead(403);
    res.end('Acesso negado');
    return;
  }

  fs.readFile(destino, (erro, dados)=>{
    if(erro){
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo nao encontrado: ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(destino).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(dados);
  });
}

function iniciar(porta){
  const servidor = http.createServer(atender);
  servidor.on('error', (e)=>{
    if(e.code === 'EADDRINUSE' && porta < PORTA_MAXIMA){
      iniciar(porta + 1);
    } else {
      console.error('Nao foi possivel iniciar o servidor:', e.message);
      process.exit(1);
    }
  });
  servidor.listen(porta, '127.0.0.1', ()=>{
    const url = 'http://localhost:' + porta + '/';
    console.log('');
    console.log('  Projetos & Produtos esta rodando em:');
    console.log('  ' + url);
    console.log('');
    console.log('  Deixe esta janela aberta enquanto usar o app.');
    console.log('  Para encerrar, feche a janela ou pressione Ctrl+C.');
    console.log('');
    if(abrirNavegador) exec('start "" "' + url + '"', { shell: 'cmd.exe' });
  });
}

iniciar(PORTA_INICIAL);
