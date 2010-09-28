/*
 * forever.js: Top level include for the forever module
 *
 * (C) 2010 and Charlie Robbins
 * MIT LICENCE
 *
 */

var sys = require('sys'),
    fs = require('fs'),
    eyes = require('eyes'),
    path = require('path'),
    events = require('events'),
    spawn = require('child_process').spawn;

var Forever = function (file, options) {
  events.EventEmitter.call(this);
  
  options.options.unshift(file);
  options.silent = options.silent || false;
  options.forever = options.forever || false;
  options.stdout = typeof options.outfile !== 'undefined';
  options.stderr = typeof options.errfile !== 'undefined';
  
  // If we should log stdout, open a file buffer 
  if (options.stdout) {
    this.stdout = fs.createWriteStream(options.outfile, { flags: 'a+', encoding: 'utf8', mode: 0666 });
  }
  
  // If we should log stderr, open a file buffer
  if (options.stderr) {
    this.stderr = fs.createWriteStream(options.errfile, { flags: 'a+', encoding: 'utf8', mode: 0666 });
  }
  
  this.times = 0;
  this.options = options;
};

sys.inherits(Forever, events.EventEmitter);

Forever.prototype.run = function () {
  var self = this, child = spawn('node', this.options.options);
  this.child = child;
  
  child.stdout.on('data', function (data) {
    // If we haven't been silenced, write to the process stdout stream
    if (!self.options.silent) {
      process.stdout.write(data);
    }
    
    // If we have been given an output file for stdout, write to it
    if (self.options.stdout) {
      self.stdout.write(data);
    }
    
    self.emit('stdout', null, data);
  });
  
  child.stderr.on('data', function (data) {
    // If we haven't been silenced, write to the process stdout stream
    if (!self.options.silent) {
      process.stdout.write(data);
    }
    
    // If we have been given an output file for stderr, write to it
    if (self.options.stderr) {
      self.stderr.write(data);
    }
    
    self.emit('stderr', null, data);
  });
  
  child.on('exit', function (code) {
    self.times++;
    if (self.options.forever || self.times < self.options.max) {
      self.emit('restart', null, self);
      process.nextTick(function () {
        self.run();
      });
    }
    else {
      // If had to write to an stdout file, close it
      if (self.options.stdout) {
        self.stdout.end();
      }
      
      // If had to write to an stderr file, close it
      if (self.options.stderr) {
        self.stderr.end();
      }
      
      self.emit('exit', null, self);
    }
  });
  
  // Chaining support
  return this;
};

// Export the Forever object
exports.Forever = Forever;

// Export the core 'run' method
exports.run = function (file, options) {
  return new Forever(file, options).run();
};