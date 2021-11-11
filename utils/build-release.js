var webpack = require("webpack"),
    config = require("../webpack.config"),
    fs = require("fs"),
    archiver = require("archiver"),
    package = require('../package.json');

delete config.chromeExtensionBoilerplate;

webpack(
  config,
  function (err) { 
    if (err) {
      throw err;
    }
    else {
      var output = fs.createWriteStream(`release/devmatics-github-extension.${package.version}.zip`);
      var archive = archiver('zip');

      output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
      });

      archive.on('error', function(err){
        throw err;
      });

      archive.pipe(output);

      archive.directory('build/', 'devmatics-github-extension');

      archive.finalize();
    }
  }
);

