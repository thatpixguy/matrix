window.addEventListener("load",function() {

  var blockWidth = 32;
  var blockHeight = blockWidth;
  var blockOffset = 16;
  var blockCX = blockOffset;
  var blockCY = blockOffset;

  // playing area
  var boardWidth = 5*blockWidth;
  var boardHeight = 6*blockHeight;
  // centre
  var boardX = 3*blockWidth + blockCX;
  var boardY = 4*blockHeight;
  var boardCX = boardWidth/2;
  var boardCY = boardHeight/2;

  var handX = 3*blockWidth+blockCX;
  var handY = 9*blockWidth+blockCY;

  var pullTimer;

  var blocked = false;

  function screenXToColumn(screenX) {
    return Math.floor(screenX/blockWidth)-1;
  }

  function columnToScreenX(column) {
    return boardX-boardCX+(column*blockWidth)+blockCX;
  }

  function screenYToRow(screenY) {
    return Math.floor((screenY-(boardY-boardCY))/blockWidth);
  }

  var fallRate = 50;

  Q = Quintus({ development: true })                          // Create a new engine instance
    .include("Sprites, Scenes, Input, 2D, Touch, UI") // Load any needed modules

    Q.setup({maximize: true})                           // Add a canvas element onto the page
     .touch(Q.SPRITE_ALL,[3,1,0]);

    Q.Sprite.extend("Block", {
      init: function(p) {
        this._super(p, {
          sheet: "blocks",
          frame: 0,
          gravity: 0,
          vx: 0,
          vy: fallRate,
          collisionMask: Q.SPRITE_DEFAULT
        });
        //this.add("2d");
        this.on("touch",function(touch) {
          this.stage.trigger("swap",this);
          console.log("touch",touch,this);
        });

        this.on("step",function(dt) {
          //console.log("block step");
          var dtStep = dt;
          while(dtStep > 0) {
            dt = Math.min(1/30,dtStep);
            this.p.x += this.p.vx * dt;
            this.p.y += this.p.vy * dt;
            //console.log(this.p.x,this.p.y);
            //this.stage.collide(this);
            dtStep -= dt;
          }
          this.stage.stack(this);
        });
      },
    });

  Q.Sprite.extend("UIPull", {
    init: function(p) {
      this._super(p, {
        sheet: "blocks",
        frame: 6,
        gravity: 0,
        type: Q.SPRITE_UI
      });
    }
  });

  Q.Sprite.extend("Fallthrough", {
    init: function(p) {
      this._super(p,{
        x: boardX, 
        y: boardY,
        w: boardWidth,
        h: boardHeight
      });
      this.on("touch",function(touch) {
        console.log("fallthrough touched");
        //x = Math.floor((touch.x)/blockWidth)*blockWidth+blockOffset;
        Q.stage(1).trigger("place",touch);
      });
    },
    draw: function(ctx) {
      //ctx.strokeStyle = "red";
      //ctx.strokeRect(-this.p.cx,-this.p.cy,this.p.w,this.p.h);
    }
  });

  Q.scene("fallthrough", function(stage) {
    var fallthrough = stage.insert(new Q.Fallthrough());
  });


  Q.scene("level1", function(stage) {


    stage.rest = [];
    stage.columns = [];

    // our very limited (and hopefully faster) version of collide
    stage.stack = function(block) {
      //console.log("stack",block);
      if(Q.state.get("hand")==block) {
        return;
      }
      var column = screenXToColumn(block.p.x);
      var y = Math.floor((block.p.y)/blockWidth)-1;

      if(!this.columns[column]) this.columns[column] = [];
      this.columns[column].push(block);
      //console.log("after stack length=",column,this.columns[column].length);
    }

    // probably called from poststep
    stage.sortColumns = function() {
      for(var i = 0; i<this.columns.length; i++) {
        this.columns[i].sort(function(a,b){
          return a.p.y-b.p.y
        });
      }
    }

    stage.collideColumns = function() {
      blocked = false;
      for(var i=0;i<this.columns.length;i++) {
        // start at the end of the array (lowest blocks)
        var lastTopY = boardY+boardCY;
        //console.log("col lastTopY",i,lastTopY,this.columns[i].length);
        var lastVY = 0;
        for(var j=this.columns[i].length-1;j>=0;j--) {
          var block = this.columns[i][j];
          var bottomY = block.p.y+blockCY;
          //console.log("lastTopY",i,j,lastTopY,block.p.y);
          if(bottomY>lastTopY) {
            // move up
            //console.log("moveup",bottomY,lastTopY,block);
            block.p.y=lastTopY-blockCY;
            block.p.vy=lastVY;
          } else if(bottomY<lastTopY) {
            if(block.p.y-blockCY<boardY-boardCY) {
              block.p.vy=fallRate/3;
            } else {
              block.p.vy=fallRate;
            }
          }
          if(block.p.vy==0) {
            this.trigger("rest",block);
          }
          lastTopY = block.p.y-blockCY;
          lastVY = block.p.vy;
        }
        if(lastTopY<(boardY-boardCY)) {
          blocked = true;
        }
      }
    }

    Q.state.set("hand",null);


    stage.on("swap",function(block) {
      //console.log("swap",block);
      hand = Q.state.get("hand")
      if(hand!=block) {
        if(hand==null) {
          block.p.x = handX; 
          block.p.y = handY; 
          block.p.vy = 0;
          Q.state.set("hand",block);
        } else {
          hand.p.x = block.p.x;
          hand.p.y = block.p.y;
          hand.p.vy = block.p.vy;
          block.p.x = handX;
          block.p.y = handY;
          block.p.vy = 0;
          Q.state.set("hand",block);
        }
      }
    // restart any stopped blocks
    //Q("Block",1).each(function(){this.p.vy=40});
    });

    stage.on("place",function(touch) {
      //console.log("place",touch);
      var hand = Q.state.get("hand")
      if(hand!=null) {
        hand.p.x = columnToScreenX(screenXToColumn(touch.x));
        //console.log("hand",hand.p);
        // slightly (but not completely) mitigate pushing blocks through the bottom of the level
        /*
           obs = Q.stage(1).detect(function(){return (this.p.y-32)<touch.y && this.p.y>touch.y});
           console.log(obs);
           if(obs) {
             touch.y = obs.p.y-32;
           }
         */
        hand.p.y = touch.y;
        hand.p.vy = fallRate;
        Q.state.set("hand",null);
      }
    });

    stage.on("pull",function(){
      // at this point, columns arent sorted
      if(blocked) {
        return;
      }
      for(var i=0;i<5;i++) {
        stage.insert(new Q.Block({x: (boardX-boardCX)+(blockWidth*i)+blockOffset, y: (boardY-boardCY)-blockOffset, frame: Math.floor(Math.random()*6)}));
      }
      pullTimer = 8;
    });

    stage.clearRest = function() {
      // clear out rest array
      if(!this.rest) {
        this.rest = [];
      }
      for(var i = 0; i < this.rest.length ; i++) {
        if(!this.rest[i]) {
          this.rest[i] = [];
        }
        for (var j = 0; j < this.rest[i].length ; j++) {
          if(this.rest[i][j]) delete(this.rest[i][j]);
        }
      }
    }

    stage.clearColumns = function() {
      // clear out column arrays
      if(!this.columns) {
        //console.log("make columns");
        this.columns = [];
      }
      for(var i=0; i< this.columns.length ; i++) {
        if(!this.columns[i]) {
          
          //console.log("make column",i);
          this.columns[i] = [];
        } else {
          //console.log("zeroing column",i);
          this.columns[i].length = 0;
        }
      }
    }

    stage.on("prestep",function(){
      //console.log("stage prestep");
      this.clearRest();
      this.clearColumns();
    });

    stage.on("step",function(dt){
      pullTimer-=dt;
      if(pullTimer<0) {
        this.trigger("pull");
      }
    });    

    stage.checkRest = function(){
      var maxX = this.rest.length;
      var maxY = Math.max.apply(null,this.rest.map(function(e){return e.length}).filter(function(e){return e!=null}));

      // should probably be building a list of objects to destroy and then destroying them to allow for T shape combos.
      // but this code seems to be allowing that anyhow.

      // check for vert matches
      for(var i = 0; i<maxX ; i++) {
        var lastFrame = -1;
        var count = 1;
        for(var j = 0; j < maxY ; j++) {
          var thisFrame = -1;
          var thisBlock = undefined;
          if(this.rest[i] && (thisBlock = this.rest[i][j])) {
            thisFrame = thisBlock.p.frame;
          }

          if ((thisFrame!=-1) && (thisFrame==lastFrame)) {
            count++;
          } else {
            // change of block type
            //if count was >=3
            if (count>=3) {
              // match those blocks
              for(; count>0; count--) {
                this.rest[i][j-count].destroy();
              }
            }
            count = 1;
          }
          lastFrame = thisFrame;
        }
        // at the end of the column(?)
        if (count>=3) {
          // match those blocks
          for(; count>0; count--) {
            this.rest[i][j-count].destroy();
          }
        }
      }

      // check for horiz matches
      for(var j = 0; j<maxY ; j++) {
        var lastFrame = -1;
        var count = 1;
        for(var i = 0; i < maxX ; i++) {
          var thisFrame = -1;
          var thisBlock = undefined;
          if(this.rest[i] && (thisBlock = this.rest[i][j])) {
            thisFrame = thisBlock.p.frame;
          }

          if ((thisFrame!=-1) && (thisFrame==lastFrame)) {
            count++;
          } else {
            // change of block type
            //if count was >=3
            if (count>=3) {
              // match those blocks
              for(; count>0; count--) {
                this.rest[i-count][j].destroy();
              }
            }
            count = 1;
          }
          lastFrame = thisFrame;
        }
        // at the end of the column(?)
        if (count>=3) {
          // match those blocks
          for(; count>0; count--) {
            this.rest[i-count][j].destroy();
          }
        }
      }

      /*
      // make floating blocks fall
      for(var i=0;i<maxX;i++) {
        var falling = false;
        for(var j=maxY-1;j>=0;j--) {
          var thisBlock = undefined;
          if(this.rest[i] && (thisBlock = this.rest[i][j])) {
            if(falling) {
              thisBlock.p.vy = fallRate;
            }
          } else {
            falling = true;
          }
        }
      }
      */

    }

    stage.on("poststep",function(){
      this.sortColumns();
      this.collideColumns();
      this.checkRest();
    });
      
    stage.on("rest",function(block){
      var x = screenXToColumn(block.p.x);
      var y = screenYToRow(block.p.y);
      //console.log("rest",x,y);
      if(block!=Q.state.get("hand")) {
        if(!this.rest[x]) this.rest[x] = [];
        this.rest[x][y] = block;
      }
    });

    stage.trigger("pull");
  });

  Q.scene("border", function(stage) {

    var tileLayer = new Q.TileLayer({
        tileW: blockWidth,
        tileH: blockHeight,
        sheet: "border",
        dataAsset: "border.json"
    });

    stage.collisionLayer(tileLayer);


  });

  Q.scene("ui", function(stage) {
    var pull = stage.insert(new Q.UIPull({x: (blockWidth*1)+blockOffset, y:(blockWidth*9)+blockOffset}));
    pull.on("touch",function(touch) {
      console.log("pull?");
      Q.stage(1).trigger("pull");
    });
  });


  Q.load("blocks8x8x4.png, border.json", function() {

    Q.sheet("blocks", "blocks8x8x4.png",
      {
        tilew: blockWidth,
        tileh: blockHeight,
        sx: 0*blockWidth,
        sy: 0*blockHeight
      });

    Q.sheet("border", "blocks8x8x4.png",
      {
        tilew: blockWidth,
        tileh: blockHeight,
        sx: 0*blockWidth,
        sy: 2*blockHeight 
      });


    Q.stageScene("fallthrough",0);
    Q.stageScene("level1",1);
    Q.stageScene("border",2);
    Q.stageScene("ui",3);

  });

});
