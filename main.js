
var Q = Quintus({ development: true })                          // Create a new engine instance
  .include("Sprites, Scenes, Input, 2D, Touch, UI") // Load any needed modules

  Q.setup()                           // Add a canvas element onto the page
   .controls()                        // Add in default controls (keyboard, buttons)
   .touch(Q.SPRITE_ALL);                          // Add in touch support (for the UI)


  Q.Sprite.extend("Block", {
    init: function(p) {
      this._super(p, {
        sheet: "blocks",
        frame: 0,
        gravity: 0,
        vx: 0,
        vy: 40,
        collisionMask: Q.SPRITE_DEFAULT
      });
      //this.add("2d");
      this.on("touch",function(touch) {
        this.stage.trigger("swap",this);
        //console.log(touch.x,touch.y,this.p);
      });
      this.on("hit",function(col,last) {
        var magnitude = 0;
        var p = this.p;
        col.impact = 0;
        var impactX = Math.abs(p.vx);
        var impactY = Math.abs(p.vy);

        //console.log("hit");

        //p.x -= col.separate[0];
        //p.y -= col.separate[1];

        if(col.normalY < -0.3) { 
          if(p.vy > 0 && (col.obj == this.stage._collisionLayer || col.obj.p.vy == 0)) { 
            p.vy = 0; 
            if(this!=Q.state.get("hand")) {
              Q.stage(1).trigger("rest",this);
            }
          }
          col.impact = impactY;
          p.x -= col.separate[0];
          p.y -= col.separate[1];

          this.trigger("bump.bottom",col);
        }
        if(col.normalY > 0.3) {
          if(p.vy < 0) { p.vy = 0; }
          col.impact = impactY;
          p.x -= col.separate[0];
          // don't move down if bumped from above
          this.trigger("bump.top",col);
        }

        if(col.normalX < -0.3) { 
          if(p.vx > 0) { p.vx = 0;  }
          col.impact = impactX;
          p.x -= col.separate[0];
          p.y -= col.separate[1];
          this.trigger("bump.right",col);
        }
        if(col.normalX > 0.3) { 
          if(p.vx < 0) { p.vx = 0; }
          col.impact = impactX;
          p.x -= col.separate[0];
          p.y -= col.separate[1];
          this.trigger("bump.left",col);
        }
      });
      this.on("step",function(dt) {
        //console.log("block step");
        var dtStep = dt;
        while(dtStep > 0) {
          dt = Math.min(1/30,dtStep);
          this.p.x += this.p.vx * dt;
          this.p.y += this.p.vy * dt;
          //console.log(this.p.x,this.p.y);
          this.stage.collide(this);
          dtStep -= dt;
        }
        if(this.p.vy == 0) {
          this.stage.trigger("rest",this);
        }
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
    this.on("touch",function(touch) {
      //console.log("pull?");
      Q.stage(1).trigger("pull");
    });
  }
});

Q.Sprite.extend("Fallthrough", {
  init: function(p) {
    this._super(p,{
      w: 5*32,
      h: 6*32,
    });
    this.on("touch",function(touch) {
      //console.log("fallthrough touched");
      x = Math.floor((touch.x)/32)*32+16;
      Q.stage(1).trigger("place",{x:x,y:touch.y});
    });
  },
  draw: function(ctx) {
    ctx.strokeStyle = "red";
    ctx.strokeRect(-this.p.cx,-this.p.cy,this.p.w,this.p.h);
  }
});

Q.scene("fallthrough", function(stage) {
  var fallthrough = stage.insert(new Q.Fallthrough({x: 3*32+16, y: 4*32}));
});

Q.scene("ui", function(stage) {
  stage.insert(new Q.UIPull({x: (32*1)+16, y:(32*9)+16}));
});

Q.scene("level1", function(stage) {

  /*
     var block = stage.insert(new Q.Block({x: (32*1)+16, y: (32+16), frame: 0}));
     var block2 = stage.insert(new Q.Block({x: (32*2)+16, y: (32+16), frame: 1}));
     var block3 = stage.insert(new Q.Block({x: (32*3)+16, y: (32+16), frame: 2}));
     var block4 = stage.insert(new Q.Block({x: (32*4)+16, y: (32+16), frame: 3}));
     var block5 = stage.insert(new Q.Block({x: (32*5)+16, y: (32+16), frame: 4}));
   */

  stage.rest = [];

  Q.state.set("hand",null);

  var tileLayer = new Q.TileLayer({
    tileW: 8*4,
      tileH: 8*4,
      sheet: "border",
      dataAsset: "border.json"
  });

  stage.collisionLayer(tileLayer);

  stage.on("check",function(block) {

  });

  stage.on("swap",function(block) {
    //console.log("swap",block);
    hand = Q.state.get("hand")
    if(hand!=block) {
      if(hand==null) {
        block.p.x = 3*32+16;
        block.p.y = 9*32+16;
        block.p.vy = 0;
        Q.state.set("hand",block);
      } else {
        hand.p.x = block.p.x;
        hand.p.y = block.p.y;
        hand.p.vy = block.p.vy;
        block.p.x = 3*32+16;
        block.p.y = 9*32+16;
        block.p.vy = 0;
        Q.state.set("hand",block);
      }
    }
  // restart any stopped blocks
  Q("Block",1).each(function(){this.p.vy=40});
  });

  stage.on("place",function(touch) {
    //console.log("place",touch);
    var hand = Q.state.get("hand")
    if(hand!=null) {
      hand.p.x = touch.x;
      // slightly (but not completely) mitigate pushing blocks through the bottom of the level
      /*
         obs = Q.stage(1).detect(function(){return (this.p.y-32)<touch.y && this.p.y>touch.y});
         console.log(obs);
         if(obs) {
         touch.y = obs.p.y-32;
         }
       */
      hand.p.y = touch.y;
      hand.p.vy = 40;
      Q.state.set("hand",null);
    }
  });

  stage.on("pull",function(){
    for(i=0;i<5;i++) {
      stage.insert(new Q.Block({x: (32*(i+1))+16, y: (16), frame: Math.floor(Math.random()*6)}));
    }
  });

  stage.on("prestep",function(){
    //console.log("stage prestep",this.rest);
    this.rest = [];
  });
  stage.on("poststep",function(){
    var maxX = this.rest.length;
    var maxY = Math.max.apply(null,this.rest.map(function(e){return e.length}).filter(function(e){return e!=null}));
    //console.log("max",maxX,maxY);
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
            //console.log(i,j,count); debugger;
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

        //console.log(i,j,count); debugger;

        // match those blocks
        for(; count>0; count--) {
          this.rest[i][j-count].destroy();
        }
      }
    }
    //console.log("poststep",maxX,maxY);
  });

  stage.on("rest",function(block){
    var x = Math.floor((block.p.x)/32)-1;
    var y = Math.floor((block.p.y)/32)-1;
    //console.log("rest",x,y);
    if(!this.rest[x]) this.rest[x] = [];
    this.rest[x][y] = block;
  });

  stage.trigger("pull");
});

Q.load("blocks8x8x4.png, border.json", function() {

  Q.sheet("blocks", "blocks8x8x4.png",
    {
      tilew: 8*4,
      tileh: 8*4,
      sx: 0,
      sy: 0
    });

  Q.sheet("border", "blocks8x8x4.png",
    {
      tilew: 8*4,
      tileh: 8*4,
      sx: 0,
      sy: 2*8*4 
    });


  Q.stageScene("fallthrough",0);
  Q.stageScene("level1",1);
  Q.stageScene("ui",2);

});
