/*The MIT License (MIT)
 Copyright (c) 2016 Ermiya Eskandary & Théophile Cailliau and other contributors
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.*/
// ==UserScript==
// @name         Slither.io-bot
// @namespace    http://slither.io/
// @version      0.7.8
// @description  Slither.io bot
// @author       Ermiya Eskandary & Théophile Cailliau
// @match        http://slither.io/
// @updateURL    https://github.com/ErmiyaEskandary/Slither.io-bot/raw/master/bot.user.js
// @downloadURL  https://github.com/ErmiyaEskandary/Slither.io-bot/raw/master/bot.user.js
// @supportURL   https://github.com/ErmiyaEskandary/Slither.io-bot/issues
// @grant        none
// ==/UserScript==
// Custom logging function - disabled by default
window.log = function() {
    if (window.logDebugging) {
        console.log.apply(console, arguments);
    }
};

window.getWidth = function() {
    return window.ww;
};
window.getHeight = function() {
    return window.hh;
};

window.getSnakeLength = function() {
    return (Math.floor(150 * (window.fpsls[window.snake.sct] + window.snake.fam / window.fmlts[window.snake.sct] - 1) - 50) / 10);
};
window.getSnakeWidth = function(sc) {
    if (sc === undefined) sc = window.snake.sc;
    return sc * 29 / 2;
};

window.getX = function() {
    return window.snake.xx;
};
window.getY = function() {
    return window.snake.yy;
};

var canvas = (function() {
    return {
        // Ratio of screen size divided by canvas size.
        canvasRatio: [window.mc.width / window.getWidth(), window.mc.height / window.getHeight()],

        // Spoofs moving the mouse to the provided coordinates.
        setMouseCoordinates: function(x, y) {
            window.xm = x;
            window.ym = y;
        },

        // Convert snake-relative coordinates to absolute screen coordinates.
        mouseToScreen: function(x, y) {
            var screenX = x + (window.getWidth() / 2);
            var screenY = y + (window.getHeight() / 2);
            return [screenX, screenY];
        },

        // Convert screen coordinates to canvas coordinates.
        screenToCanvas: function(x, y) {
            var canvasX = window.csc * (x * canvas.canvasRatio[0]) - parseInt(window.mc.style.left);
            var canvasY = window.csc * (y * canvas.canvasRatio[1]) - parseInt(window.mc.style.top);
            return [canvasX, canvasY];
        },

        // Convert map coordinates to mouse coordinates.
        mapToMouse: function(x, y) {
            var mouseX = (x - window.getX()) * window.gsc;
            var mouseY = (y - window.getY()) * window.gsc;
            return [mouseX, mouseY];
        },
        
        // Map cordinates to Canvas cordinate shortcut
        mapToCanvas: function(point) {
            var c = canvas.mapToMouse(point.x,point.y);
            c = canvas.mouseToScreen(c[0],c[1]);
            c = canvas.screenToCanvas(c[0],c[1]);
            return {x: c[0], y: c[1]};
        },

        // Adjusts zoom in response to the mouse wheel.
        setZoom: function(e) {
            // Scaling ratio
            if (window.gsc) {
                window.gsc *= Math.pow(0.9, e.wheelDelta / -120 || e.detail / 2 || 0);
            }
        },

        // Restores zoom to the default value.
        resetZoom: function() {
            window.gsc = 0.9;
        },

        // Sets background to the given image URL.
        // Defaults to slither.io's own background.
        setBackground: function(url) {
            url = typeof url !== 'undefined' ? url : '/s/bg45.jpg';
            window.ii.src = url;
        },

        // TODO what does window scale mean?
        getScale: function() {
            return window.gsc;
        },

        // Manual mobile rendering
        toggleMobileRendering: function(mobileRendering) {
            window.mobileRender = mobileRendering;
            window.log('Mobile rendering set to: ' + window.mobileRender);
            userInterface.savePreference('mobileRender', window.mobileRender);
            // Set render mode
            if (window.mobileRender) {
                canvas.setBackground('data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs');
                window.render_mode = 1;
            } else {
                canvas.setBackground();
                window.render_mode = 2;
            }
        },

        // Draw a dot on the canvas.
        drawDot: function(x, y, radius, colour, fill) {
            var context = window.mc.getContext('2d');
            context.beginPath();
            context.strokeStyle = colour;
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.closePath();
            if (fill) {
                context.fillStyle = ('green red white yellow black cyan blue'.indexOf(colour) < 0) ? 'white' : colour;
                context.fill();
            }
            context.stroke();
        },

        // Draw an angle.
        // @param {number} start -- where to start the angle
        // @param {number} angle -- width of the angle
        // @param {bool} danger -- green if false, red if true
        drawAngle: function(start, angle, danger) {
            var context = window.mc.getContext('2d');
            context.globalAlpha = 0.6;
            context.beginPath();
            context.moveTo(window.mc.width / 2, window.mc.height / 2);
            context.arc(window.mc.width / 2, window.mc.height / 2, window.gsc * 100, start, angle);
            context.lineTo(window.mc.width / 2, window.mc.height / 2);
            context.closePath();
            context.fillStyle = (danger) ? 'red' : 'green';
            context.fill();
            context.stroke();
            context.globalAlpha = 1;
        },

        // Draw a line on the canvas.
        drawLine: function(x1, y1, x2, y2, colour, width) {
            if (width === undefined) width = 5;
            var context = window.mc.getContext('2d');
            context.beginPath();
            context.lineWidth = width * canvas.getScale();
            context.strokeStyle = colour;
            context.moveTo(x1, y1);
            context.lineTo(x2, y2);
            context.stroke();
            context.lineWidth = 1;
        },

        // Check if a point is between two vectors.
        // The vectors have to be anticlockwise (sectorEnd on the left of sectorStart).
        isBetweenVectors: function(point, sectorStart, sectorEnd) {
            var center = [window.snake.xx, window.snake.yy];
            if (point.xx) {
                // Point coordinates relative to center
                var relPoint = {
                    x: point.xx - center[0],
                    y: point.yy - center[1]
                };
                return (!canvas.areClockwise(sectorStart, relPoint) &&
                    canvas.areClockwise(sectorEnd, relPoint));
            }
            return false;
        },

        // Angles are given in radians. The overall angle (endAngle-startAngle)
        // cannot be above Math.PI radians (180°).
        isInsideAngle: function(point, startAngle, endAngle) {
            // calculate normalized vectors from angle
            var startAngleVector = {
                x: Math.cos(startAngle),
                y: Math.sin(startAngle)
            };
            var endAngleVector = {
                x: Math.cos(endAngle),
                y: Math.sin(endAngle)
            };
            // Use isBetweenVectors to check if the point belongs to the angle
            return canvas.isBetweenVectors(point, startAngleVector, endAngleVector);
        },

        // Given two vectors, return a truthy/falsy value depending on their position relative to each other.
        areClockwise: function(vector1, vector2) {
            //Calculate the dot product.
            return -vector1.x * vector2.y + vector1.y * vector2.x > 0;
        },
        
        // Given the start and end of a line, is point left.
        isLeft: function(start, end, point)
        {
            return ((end.x - start.x)*(point.y - start.y) - (end.y - start.y)*(point.x - start.x)) > 0;
            
        },

        // Given an object (of which properties xx and yy are not null),
        // return the object with an additional property 'distance'.
        getDistanceFromSnake: function(point) {
            if (point === null) return null;
            point.distance = canvas.getDistance(window.getX(), window.getY(),
                point.xx, point.yy);
            return point;
        },

        // Get a distance from point (x1; y1) to point (x2; y2).
        getDistance: function(x1, y1, x2, y2) {
            var distance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
            return distance;
        },
        
        // Get distance squared
        getDistance2: function(x1, y1, x2, y2) {
            var distance2 = Math.pow(x1-x2,2) + Math.pow(y1 - y2, 2);
            return distance2;
        },
        
        getDistance2FromSnake: function(point) {
            if (point === null) return null;
            point.distance = canvas.getDistance2(window.getX(), window.getY(),
                point.xx, point.yy);
            return point;
        },

        // Screen to Canvas coordinate conversion - used for collision detection
        collisionScreenToCanvas: function(circle) {
            var newCircle = canvas.mapToMouse(circle.x, circle.y);
            newCircle = canvas.mouseToScreen(newCircle[0], newCircle[1]);
            newCircle = canvas.screenToCanvas(newCircle[0], newCircle[1]);
            return {
                x: newCircle[0],
                y: newCircle[1],
                radius: circle.radius
            };
        },

        // Check if circles intersect
        circleIntersect: function(circle1, circle2) {
            var bothRadii = circle1.radius + circle2.radius;

            // Pretends the circles are squares for a quick collision check.
            // If it collides, do the more expensive circle check.
            if (circle1.x + bothRadii > circle2.x &&
                circle1.y + bothRadii > circle2.y &&
                circle1.x < circle2.x + bothRadii &&
                circle1.y < circle2.y + bothRadii) {

                var distance2 = canvas.getDistance2(circle1.x,circle1.y,circle2.x,circle2.y);

                if (distance2 < bothRadii*bothRadii) {
                    if (window.visualDebugging) {
                        var collisionPointX = ((circle1.x * circle2.radius) + (circle2.x * circle1.radius)) / bothRadii;
                        var collisionPointY = ((circle1.y * circle2.radius) + (circle2.y * circle1.radius)) / bothRadii;
                        canvas.drawDot(collisionPointX, collisionPointY, circle2.radius, 'cyan', true);
                        canvas.drawDot(circle2.x, circle2.y, circle2.radius, 'red', true);
                    }
                    return true;
                }
            }
            return false;
        }
    };
})();

var bot = (function() {
    // Save the original slither.io onmousemove function so we can re enable it back later
    var original_onmousemove = window.onmousemove;

    return {
        ranOnce: false,
        tickCounter: 0,
        foodIndx: 0,
        isBotRunning: false,
        isBotEnabled: true,
        collisionPoints: [],
        
        startBot: function() {
            if (window.autoRespawn && !window.playing && bot.isBotEnabled && bot.ranOnce && !bot.isBotRunning) {
                bot.connectBot();
            }
        },

        launchBot: function() {
            window.log('Starting Bot.');
            bot.isBotRunning = true;
            // Removed the onmousemove listener so we can move the snake manually by setting coordinates
            window.onmousemove = function() {};
        },

        // Stops the bot
        stopBot: function() {
            window.log('Stopping Bot.');
            window.setAcceleration(0); // Disable the "sprint"
            bot.isBotRunning = false;
            // Re-enable the original onmousemove function
            window.onmousemove = original_onmousemove;
        },

        // Connects the bot
        connectBot: function() {
            if (!window.autoRespawn) return;
            bot.stopBot(); // Just in case
            window.log('Connecting...');
            window.connect();

            // Wait until we're playing to start the bot
            window.botCanStart = setInterval(function() {
                if (window.playing) {
                    bot.launchBot();
                    clearInterval(window.botCanStart);
                }
            }, 100);
        },

        forceConnect: function() {
            if (!window.connect) {
                return;
            }
            window.forcing = true;
            if (!window.bso) {
                window.bso = {};
            }
            window.currentIP = window.bso.ip + ":" + window.bso.po;
            var srv = window.currentIP.trim().split(":");
            window.bso.ip = srv[0];
            window.bso.po = srv[1];
            window.connect();
        },

        quickRespawn: function() {
            window.dead_mtm = 0;
            window.login_fr = 0;
            window.forceConnect();
        },

        changeSkin: function() {
            if (window.playing && window.snake !== null) {
                var skin = window.snake.rcv,
                    max = window.max_skin_cv || 30;
                skin++;
                if (skin > max) {
                    skin = 0;
                }
                window.setSkin(window.snake, skin);
            }
        },

        rotateSkin: function() {
            if (!window.rotateskin) {
                return;
            }
            bot.changeSkin();
            setTimeout(bot.rotateSkin, 500);
        },

        // Avoid collison point 180 degree
        avoidCollisionPoint: function(collisionPoint)
        {
            window.goalCoordinates = canvas.mapToMouse(window.snake.xx + (window.snake.xx - collisionPoint.xx), window.snake.yy + (window.snake.yy - collisionPoint.yy));
            canvas.setMouseCoordinates(window.goalCoordinates[0], window.goalCoordinates[1]);
        },
        
        // Avoid collision point 90 degree
        avoidCollisionPoint90: function(collisionPoint) 
        {
            var end = { 
                x: window.snake.xx + collisionPoint.distance*Math.cos(window.snake.ang),
                y: window.snake.yy + collisionPoint.distance*Math.sin(window.snake.ang),
            };
            
            var sin = 1;
            
            if (canvas.isLeft(
                { x: window.snake.xx, y: window.snake.yy }, end,
                { x: collisionPoint.xx, y: collisionPoint.yy })) {
                sin = -1;
            }

            var goal_x = -sin*(collisionPoint.yy-window.snake.yy) + window.snake.xx;
            var goal_y = sin*(collisionPoint.xx-window.snake.xx) + window.snake.yy;
            
            window.goalCoordinates = canvas.mapToMouse(goal_x,goal_y);
            canvas.setMouseCoordinates(window.goalCoordinates[0],window.goalCoordinates[1]);
        },
        
        // Avoid collision point 135 degree
        avoidCollisionPoint135: function (collisionPoint) {
            var end = {
                x: window.snake.xx + collisionPoint.distance * Math.cos(window.snake.ang),
                y: window.snake.yy + collisionPoint.distance * Math.sin(window.snake.ang),
            };

            var cos = -0.7071;
            var sin = 0.7071;

            if (canvas.isLeft(
                { x: window.snake.xx, y: window.snake.yy }, end,
                { x: collisionPoint.xx, y: collisionPoint.yy })) {
                sin = -sin;
            }

            var goal_x = cos * (collisionPoint.xx - window.snake.xx) - sin * (collisionPoint.yy - window.snake.yy) + window.snake.xx;
            var goal_y = sin * (collisionPoint.xx - window.snake.xx) + cos * (collisionPoint.yy - window.snake.yy) + window.snake.yy;

            window.goalCoordinates = canvas.mapToMouse(goal_x, goal_y);
            canvas.setMouseCoordinates(window.goalCoordinates[0], window.goalCoordinates[1]);
        },

        // Avoid collision using collision points
        avoidCollision: function(distance) {
            var cpts = bot.collisionPoints;
            var x = 0;
            var y = 0;
            
            for (var i = 0 ; i < cpts.length ; i++)
            {
                if (Math.abs(cpts[0].distance - cpts[i].distance) <= distance) {
                    x += cpts[i].xx;
                    y += cpts[i].yy;
                } else {
                    i--;
                    break;
                }
            }
            
            x = x / (i+1);
            y = y / (i+1);
                   
            window.goalCoordinates = canvas.mapToMouse(Math.round(window.snake.xx + (window.snake.xx - x)), Math.round(window.snake.yy + (window.snake.yy - y)));
            if(cpts[0].sp > 8) {
                window.setAcceleration(1);
            } else {
                window.setAcceleration(0);
            }
            
            canvas.setMouseCoordinates(window.goalCoordinates[0], window.goalCoordinates[1]);
        },

        // Adjust goal direction
        changeGoalCoords: function(circle1) {
            if ((circle1.x != bot.collisionPoint.x || circle1.y != bot.collisionPoint.y)) {
                bot.collisionPoint = circle1;
                window.goalCoordinates = canvas.mapToMouse(window.snake.xx + (window.snake.xx - bot.collisionPoint.x), window.snake.yy + (window.snake.yy - bot.collisionPoint.y));
                window.setAcceleration(0);
                canvas.setMouseCoordinates(window.goalCoordinates[0], window.goalCoordinates[1]);
            }
        },

        // Sorting by  property 'distance'
        sortDistance: function(a, b) {
            return a.distance - b.distance;
        },

        // Sorting function for food, from property 'clusterCount'
		sortFood: function(a, b) {
			return (a.clusterScore == b.clusterScore ? 0 : a.clusterScore / a.distance  >  b.clusterScore / b.distance  ? -1 : 1);
		},

        // Sorting function for prey, from property 'distance'
        sortPrey: function(a, b) {
            return a.distance - b.distance;
        },
        
        // Get closest collision point per snake.
        getCollisionPoints: function() {
            bot.collisionPoints = [];
            
            for (var snake in window.snakes){
                if (window.snakes[snake].nk != window.snake.nk) {
                    if (window.visualDebugging) {
                        var hCircle = canvas.collisionScreenToCanvas({
                            x: window.snakes[snake].xx,
                            y: window.snakes[snake].yy,
                            radius: window.getSnakeWidth(window.snakes[snake].sc) * canvas.getScale()
                        });
                        canvas.drawDot(hCircle.x, hCircle.y, hCircle.radius, 'red', false);
                    }
                    
                    for (var pts in window.snakes[snake].pts) {
                        if(!window.snakes[snake].pts[pts].dying){
                            var collisionPoint = {
                                headxx: window.snakes[snake].xx,
                                headyy: window.snakes[snake].yy,
                                xx: window.snakes[snake].pts[pts].xx,                                
                                yy: window.snakes[snake].pts[pts].yy,
                                sc: window.snakes[snake].sc,
                                sp: window.snakes[snake].sp,
                                ang: window.snakes[snake].ang,
                            };

                            canvas.getDistance2FromSnake(collisionPoint);
                            
                            if (bot.collisionPoints[snake] === undefined || bot.collisionPoints[snake].distance > collisionPoint.distance)
                            {
                                bot.collisionPoints[snake] = collisionPoint;
                            }
                        }
                    }
                }
            }
            bot.collisionPoints = bot.collisionPoints.filter(function(n) { return n !== undefined; });
            bot.collisionPoints.sort(bot.sortDistance);
        },

        // Checks to see if you are going to collide with anything in the collision detection radius
        checkCollision: function(r) {
            if (!window.collisionDetection) return false;
            
            var ra = r;
            if (window.snake.sp > 8) ra = r * 2;
            
            if (window.visualDebugging) {
                var headCoord = canvas.mapToCanvas({x: window.snake.xx, y: window.snake.yy});
                canvas.drawLine(headCoord.x, headCoord.y, headCoord.x + r*2*Math.cos(window.snake.ang), headCoord.y + r*2*Math.sin(window.snake.ang), 'orange', 1);
            }

            
            var headCircle = canvas.collisionScreenToCanvas({
                x: window.getX(),
                y: window.getY(),
                radius: ra * .6 * canvas.getScale()
            });
            
            var forwardCircle = canvas.collisionScreenToCanvas({
                x: window.getX() + Math.cos(window.snake.ang) * r / 2,
                y: window.getY() + Math.sin(window.snake.ang) * r / 2,
                radius: ra * .6 * canvas.getScale()
            });
       
            if (window.visualDebugging) {
                canvas.drawDot(headCircle.x, headCircle.y, headCircle.radius, 'blue', false);
                canvas.drawDot(forwardCircle.x, forwardCircle.y, forwardCircle.radius, 'blue', false);
            }
            
            
            bot.getCollisionPoints();
            if (bot.collisionPoints.length === 0) return false;
            
            for (var i = 0; i < bot.collisionPoints.length; i++)
            {
                var collisionCircle = canvas.collisionScreenToCanvas({
                    x: bot.collisionPoints[i].xx,
                    y: bot.collisionPoints[i].yy,
                    radius: window.getSnakeWidth(bot.collisionPoints[i].sc) * canvas.getScale()
                });
                
                if (canvas.circleIntersect(headCircle,collisionCircle) || canvas.circleIntersect(forwardCircle,collisionCircle))
                {
                    bot.avoidCollisionPoint(bot.collisionPoints[i]);
                    return true;
                }
                
                var eHeadCircle = canvas.collisionScreenToCanvas({
                    x: bot.collisionPoints[i].headxx,
                    y: bot.collisionPoints[i].headyy,
                    radius: window.getSnakeWidth(bot.collisionPoints[i].sc) * canvas.getScale()
                });
                
                var fullHeadCircle = {x: headCircle.x, y: headCircle.y, radius: r * 1.5 * canvas.getScale()};
                
                if (window.visualDebugging) {
                    canvas.drawDot(fullHeadCircle.x,fullHeadCircle.y,fullHeadCircle.radius,'red');
                }
                
                if (canvas.circleIntersect(fullHeadCircle,eHeadCircle)) {
                    if (bot.collisionPoints[i].sp > 8) {
                        window.setAcceleration(1);
                    }
                    bot.avoidCollisionPoint({xx: bot.collisionPoints[i].headxx, yy: bot.collisionPoints[i].headyy});
                    return true;
                }         
            }
            window.setAcceleration(0);
            return false;
        },

        // Sort food based on distance
        getSortedFood: function() {
            // Filters the nearest food by getting the distance
            return window.foods.filter(function(val) {
                return val !== null && val !== undefined;
            }).map(canvas.getDistance2FromSnake).filter(function(val) {
                var isInsideDangerAngles = canvas.isInsideAngle(val, window.snake.ang - 3 * Math.PI / 4, window.snake.ang - Math.PI / 4);
                isInsideDangerAngles = isInsideDangerAngles || canvas.isInsideAngle(val, window.snake.ang + Math.PI / 4, window.snake.ang + 3 * Math.PI / 4);
                return !(isInsideDangerAngles && (val.distance <= 150*150));
            }).sort(bot.sortDistance);
        },

        // Sort prey based on distance
        getSortedPrey: function() {
            // Filters the nearest food by getting the distance
            return window.preys.filter(function(val) {
                return val !== null;
            }).map(canvas.getDistance2FromSnake).sort(bot.sortDistance);
        },

        computeFoodGoal: function() {
            var sortedFood = bot.getSortedFood();

            var bestClusterIndx = 0;
            var bestClusterScore = 0;
            var bestClusterAbsScore = 0;
            var bestClusterX = 0;
            var bestClusterY = 0;

            // there is no need to view more points (for performance)
            var nIter = Math.min(sortedFood.length, 300);
            for (var i = 0; i < nIter; i += 2) {
                var clusterScore = 0;
                var clusterSize = 0;
                var clusterAbsScore = 0;
                var clusterSumX = 0;
                var clusterSumY = 0;

                var p1 = sortedFood[i];
                for (var j = 0; j < nIter; ++j) {
                    var p2 = sortedFood[j];
                    var dist = canvas.getDistance2(p1.xx, p1.yy, p2.xx, p2.yy);
                    if (dist < 100*100) {
                        clusterScore += p2.sz;
                        clusterSumX += p2.xx * p2.sz;
                        clusterSumY += p2.yy * p2.sz;
                        clusterSize += 1;
                    }
                }
                clusterAbsScore = clusterScore;
                clusterScore /= p1.distance;
                if (clusterSize > 2 && clusterScore > bestClusterScore) {
                    bestClusterScore = clusterScore;
                    bestClusterAbsScore = clusterAbsScore;
                    bestClusterX = clusterSumX / clusterAbsScore;
                    bestClusterY = clusterSumY / clusterAbsScore;
                    bestClusterIndx = i;
                }
            }

            window.currentFoodX = bestClusterX;
            window.currentFoodY = bestClusterY;

            // if see a large cluster then use acceleration
            if (bestClusterAbsScore > 50) {
                window.foodAcceleration = 1;
            } else {
                window.foodAcceleration = 0;
            }
        },

        // Defense mode - bot turns around in a circle
        playDefence: function(dir) {
            window.kd_l = (dir === 'l');
            window.kd_r = (dir === 'r');
            canvas.setMouseCoordinates(window.getWidth() / 2, window.getHeight() / 2);
        },

        // Called by the window loop, this is the main logic of the bot.
        thinkAboutGoals: function() {
            // If no enemies or obstacles, go after what you are going after
            if (!bot.checkCollision(window.getSnakeWidth() * window.collisionRadiusMultiplier * canvas.getScale()) ) {
                window.setAcceleration(0);
                // Save CPU by only calculating every Nth frame
                if (++bot.tickCounter >= 15) {
                    bot.tickCounter = 0;
                    // Current food
                    bot.computeFoodGoal();

                    var coordinatesOfClosestFood = canvas.mapToMouse(window.currentFoodX, window.currentFoodY);
                    window.goalCoordinates = coordinatesOfClosestFood;
                    // Check for preys, enough "length"
                    if (window.preys.length > 0 && window.huntPrey) {
                        // Sort preys based on their distance relative to player's snake
                        window.sortedPrey = bot.getSortedPrey();
                        // Current prey
                        window.currentPrey = window.sortedPrey[0];
                        // Convert coordinates of the closest prey using mapToMouse
                        var coordinatesOfClosestPrey = canvas.mapToMouse(window.currentPrey.xx, window.currentPrey.yy);
                        // Check for the distance
                        if (window.currentPrey.distance <= Math.pow(window.getSnakeLength(), 2) / 2) {
                            // Set the mouse coordinates to the coordinates of the closest prey
                            window.goalCoordinates = coordinatesOfClosestPrey;
                            // "Sprint" enabled
                            window.setAcceleration(1);
                        }
                    }
                    window.kd_l = false;
                    window.kd_r = false;
                    canvas.setMouseCoordinates(window.goalCoordinates[0], window.goalCoordinates[1]);
                }
            } else {
                bot.tickCounter = -(userInterface.framesPerSecond.getFPS() / 2);
            }
        }
    };
})();

var userInterface = (function() {
    // Save the original slither.io functions so we can modify them, or reenable them later.
    var original_keydown = document.onkeydown;
    var original_onmouseDown = window.onmousedown;
    var original_oef = window.oef;

    return {
        // Save variable to local storage
        savePreference: function(item, value) {
            window.localStorage.setItem(item, value);
        },

        // Load a variable from local storage
        loadPreference: function(preference, defaultVar) {
            var savedItem = window.localStorage.getItem(preference);
            if (savedItem !== null) {
                if (savedItem == 'true') {
                    window[preference] = true;
                } else if (savedItem == 'false') {
                    window[preference] = false;
                } else {
                    window[preference] = savedItem;
                }
                window.log('Setting found for ' + preference + ': ' + window[preference]);
            } else {
                window[preference] = defaultVar;
                window.log('No setting found for ' + preference + '. Used default: ' + window[preference]);
            }
            return window[preference];
        },

        // Saves username when you click on "Play" button
        playButtonClickListener: function() {
            userInterface.saveNick();
            userInterface.loadPreference('autoRespawn', false);
        },

        // Preserve nickname
        saveNick: function() {
            var nick = document.getElementById('nick').value;
            userInterface.savePreference('savedNick', nick);
        },

        // Add interface elements to the page.
        // @param {string} id
        // @param {string} className
        // @param style
        appendDiv: function(id, className, style) {
            var div = document.createElement('div');
            if (id) div.id = id;
            if (className) div.className = className;
            if (style) div.style = style;
            document.body.appendChild(div);
        },

        // Store FPS data
        framesPerSecond: {
            startTime: 0,
            frameNumber: 0,
            filterStrength: 40,
            lastLoop: 0,
            frameTime: 0,
            getFPS: function() {
                var thisLoop = performance.now();
                var thisFrameTime = thisLoop - this.lastLoop;
                this.frameTime += (thisFrameTime - this.frameTime) / this.filterStrength;
                this.lastLoop = thisLoop;
                return (1000 / this.frameTime).toFixed(0);
            }
        },

        onkeydown: function(e) {
            // Original slither.io onkeydown function + whatever is under it
            original_keydown(e);
            if (document.activeElement.parentElement !== window.nick_holder) {
                // Letter `T` to toggle bot
                if (e.keyCode === 84) {
                    if (bot.isBotRunning) {
                        bot.stopBot();
                        bot.isBotEnabled = false;
                    } else {
                        bot.launchBot();
                        bot.isBotEnabled = true;
                    }
                }
                // Letter 'U' to toggle debugging (console)
                if (e.keyCode === 85) {
                    window.logDebugging = !window.logDebugging;
                    console.log('Log debugging set to: ' + window.logDebugging);
                    userInterface.savePreference('logDebugging', window.logDebugging);
                }
                // Letter 'Y' to toggle debugging (visual)
                if (e.keyCode === 89) {
                    window.visualDebugging = !window.visualDebugging;
                    console.log('Visual debugging set to: ' + window.visualDebugging);
                    userInterface.savePreference('visualDebugging', window.visualDebugging);
                }
                // Letter 'I' to toggle autorespawn
                if (e.keyCode === 73) {
                    window.autoRespawn = !window.autoRespawn;
                    console.log('Automatic Respawning set to: ' + window.autoRespawn);
                    userInterface.savePreference('autoRespawn', window.autoRespawn);
                }
                // Letter 'W' to auto rotate skin
                if (e.keyCode == 87) {
                    window.rotateskin = !window.rotateskin;
                    console.log('Auto skin rotator set to: ' + window.rotateskin);
                    userInterface.savePreference('rotateskin', window.rotateskin);
                    bot.rotateSkin();
                }
                // Letter 'O' to change rendermode (visual)
                if (e.keyCode === 79) {
                    window.toggleMobileRendering(!window.mobileRender);
                }
                // Letter 'P' to toggle hunting Prey
                if (e.keyCode === 80) {
                    window.huntPrey = !window.huntPrey;
                    console.log('Prey hunting set to: ' + window.huntPrey);
                    userInterface.savePreference('huntPrey', window.huntPrey);
                }
                // Letter 'C' to toggle Collision detection / enemy avoidance
                if (e.keyCode === 67) {
                    window.collisionDetection = !window.collisionDetection;
                    console.log('collisionDetection set to: ' + window.collisionDetection);
                    userInterface.savePreference('collisionDetection', window.collisionDetection);
                }
                // Letter 'A' to increase collision detection radius
                if (e.keyCode === 65) {
                    window.collisionRadiusMultiplier++;
                    console.log('collisionRadiusMultiplier set to: ' + window.collisionRadiusMultiplier);
                    userInterface.savePreference('collisionRadiusMultiplier', window.collisionRadiusMultiplier);
                }
                // Letter 'S' to decrease collision detection radius
                if (e.keyCode === 83) {
                    if (window.collisionRadiusMultiplier > 1) {                        
                        window.collisionRadiusMultiplier--;
                        console.log('collisionRadiusMultiplier set to: ' + window.collisionRadiusMultiplier);
                        userInterface.savePreference('collisionRadiusMultiplier', window.collisionRadiusMultiplier);
                    }
                }
                // Letter 'D' to toggle defence mode
                if (e.keyCode === 68) {
                    window.defence = !window.defence;
                    console.log('Defence set to: ' + window.defence);
                    userInterface.savePreference('defence', window.defence);
                }
                // Letter 'Z' to reset zoom
                if (e.keyCode === 90) {
                    canvas.resetZoom();
                }
                // Letter 'Q' to quit to main menu
                if (e.keyCode == 81) {
                    window.autoRespawn = false;
                    userInterface.quit();
                }
                // 'ESC' to quickly respawn
                if (e.keyCode == 27) {
                    bot.quickRespawn();
                }
                // Letter 'X' to change skin
                if (e.keyCode == 88) {
                    bot.changeSkin();
                }
                // Save nickname when you press "Enter"
                if (e.keyCode == 13) {
                    userInterface.saveNick();
                }
            }
        },

        onmousedown: function(e) {
            original_onmouseDown(e);
            e = e || window.event;
            if (window.playing) {
                switch (e.which) {
                    // "Left click" to manually speed up the slither
                    case 1:
                        window.setAcceleration(1);
                        window.log('Manual boost...');
                        break;
                        // "Right click" to toggle bot in addition to the letter "T"
                    case 3:
                        if (bot.isBotRunning) {
                            bot.stopBot();
                            bot.isBotEnabled = false;
                        } else {
                            bot.launchBot();
                            bot.isBotEnabled = true;
                        }
                        break;
                }
            }
        },

        onFrameUpdate: function() {
            // Botstatus overlay
            var generalStyle = '<span style = "opacity: 0.35";>';
            window.botstatus_overlay.innerHTML = generalStyle + '(T / Right Click) Bot: </span>' + userInterface.handleTextColor(bot.isBotRunning);
            window.visualdebugging_overlay.innerHTML = generalStyle + '(Y) Visual debugging: </span>' + userInterface.handleTextColor(window.visualDebugging);
            window.logdebugging_overlay.innerHTML = generalStyle + '(U) Log debugging: </span>' + userInterface.handleTextColor(window.logDebugging);
            window.autorespawn_overlay.innerHTML = generalStyle + '(I) Auto respawning: </span>' + userInterface.handleTextColor(window.autoRespawn);
            window.rotateskin_overlay.innerHTML = generalStyle + '(W) Auto skin rotator: </span>' + userInterface.handleTextColor(window.rotateskin);
            window.rendermode_overlay.innerHTML = generalStyle + '(O) Mobile rendering: </span>' + userInterface.handleTextColor(window.mobileRender);
            window.huntprey_overlay.innerHTML = generalStyle + '(P) Prey hunting: </span>' + userInterface.handleTextColor(window.huntPrey);
            window.collision_detection_overlay.innerHTML = generalStyle + '(C) Collision detection: </span>' + userInterface.handleTextColor(window.collisionDetection);
            window.collision_radius_multiplier_overlay.innerHTML = generalStyle + '(A/S) Collision radius multiplier: ' + window.collisionRadiusMultiplier + ' </span>';
            window.defence_overlay.innerHTML = generalStyle + '(D) Defence: </span>' + userInterface.handleTextColor(window.defence);
            window.resetzoom_overlay.innerHTML = generalStyle + '(Z) Reset zoom </span>';
            window.scroll_overlay.innerHTML = generalStyle + '(Mouse Wheel) Zoom in/out </span>';
            window.quittomenu_overlay.innerHTML = generalStyle + '(Q) Quit to menu </span>';
            window.changeskin_overlay.innerHTML = generalStyle + '(X) Change skin </span>';
            window.quickResp_overlay.innerHTML = generalStyle + '(ESC) Quick Respawn </span>';
            window.fps_overlay.innerHTML = generalStyle + 'FPS: ' + userInterface.framesPerSecond.getFPS() + '</span>';

            if (window.position_overlay && window.playing) {
                // Display the X and Y of the snake
                window.position_overlay.innerHTML = generalStyle + 'X: ' + (Math.round(window.snake.xx) || 0) + ' Y: ' + (Math.round(window.snake.yy) || 0) + '</span>';
            }
            if (window.playing && window.ip_overlay) {
                window.ip_overlay.innerHTML = generalStyle + 'Server: ' + window.bso.ip + ':' + window.bso.po;
                '</span>';
            }
            if (window.playing && window.visualDebugging && bot.isBotRunning) {
                // Only draw the goal when a bot has a goal.
                if (window.goalCoordinates && window.goalCoordinates.length == 2) {
                    var drawGoalCoordinates = canvas.mouseToScreen(window.goalCoordinates[0], window.goalCoordinates[1]);
                    drawGoalCoordinates = canvas.screenToCanvas(drawGoalCoordinates[0], drawGoalCoordinates[1]);
                    var headCoord = canvas.mapToCanvas({x: window.snake.xx, y: window.snake.yy});
                    canvas.drawLine(headCoord.x, headCoord.y, drawGoalCoordinates[0], drawGoalCoordinates[1], 'green');
                    canvas.drawDot(drawGoalCoordinates[0], drawGoalCoordinates[1], 5, 'red', true);
                    canvas.drawAngle(window.snake.ang + Math.PI / 4, window.snake.ang + 3 * Math.PI / 4, true);
                    canvas.drawAngle(window.snake.ang - 3 * Math.PI / 4, window.snake.ang - Math.PI / 4, true);
                }
            }
        },

        oef: function() {
            // Original slither.io oef function + whatever is under it
            // requestAnimationFrame(window.loop);
            original_oef();
            if (bot.isBotRunning) window.loop();
            userInterface.onFrameUpdate();
        },

        // Quit to menu
        quit: function() {
            if (window.playing && window.resetGame) {
                window.want_close_socket = true;
                window.dead_mtm = 0;
                if (window.play_btn) {
                    window.play_btn.setEnabled(true);
                }
                window.resetGame();
            }
        },

        // Update the relation between the screen and the canvas.
        onresize: function() {
            window.resize();
            // Canvas different size from the screen (often bigger).
            canvas.canvasRatio = [window.mc.width / window.getWidth(),
                window.mc.height / window.getHeight()
            ];
        },

        handleTextColor: function(enabled) {
            return '<span style=\"opacity: 0.8; color:' + (enabled ? 'green;\">enabled' : 'red;\">disabled') + '</span>';
        }
    };
})();
window.play_btn.btnf.addEventListener('click', userInterface.playButtonClickListener);
document.onkeydown = userInterface.onkeydown;
window.onmousedown = userInterface.onmousedown;
window.oef = userInterface.oef;
window.onresize = userInterface.onresize;


// Loop for running the bot
window.loop = function() {
    // If the game and the bot are running
    if (window.playing && bot.isBotEnabled) {
        bot.ranOnce = true;

        // TODO: Check some condition to see if we should play defence
        // Right now this just uses the manual toggle
        if (window.defence) {
            bot.playDefence('l');
            return;
        }
        bot.thinkAboutGoals();
    } else {
        if (bot.ranOnce) {
            //window.startInterval = setInterval(bot.startBot, 1000);
            bot.stopBot();
        }
    }
};

// Main
(function() {

    // Load preferences
    userInterface.loadPreference('logDebugging', false);
    userInterface.loadPreference('visualDebugging', false);
    userInterface.loadPreference('autoRespawn', false);
    userInterface.loadPreference('mobileRender', false);
    userInterface.loadPreference('huntPrey', true);
    userInterface.loadPreference('collisionDetection', true);
    userInterface.loadPreference('collisionRadiusMultiplier', 8);
    userInterface.loadPreference('defence', false);
    userInterface.loadPreference('rotateskin', false);
    window.nick.value = userInterface.loadPreference('savedNick', 'Slither.io-bot');

    // Overlays

    // Top left
    window.generalstyle = 'color: #FFF; font-family: Arial, \'Helvetica Neue\', Helvetica, sans-serif; font-size: 14px; position: fixed; z-index: 7;';
    userInterface.appendDiv('botstatus_overlay', 'nsi', window.generalstyle + 'left: 30; top: 65px;');
    userInterface.appendDiv('visualdebugging_overlay', 'nsi', window.generalstyle + 'left: 30; top: 80px;');
    userInterface.appendDiv('logdebugging_overlay', 'nsi', window.generalstyle + 'left: 30; top: 95px;');
    userInterface.appendDiv('autorespawn_overlay', 'nsi', window.generalstyle + 'left: 30; top: 110px;');
    userInterface.appendDiv('rendermode_overlay', 'nsi', window.generalstyle + 'left: 30; top: 125px;');
    userInterface.appendDiv('rotateskin_overlay', 'nsi', window.generalstyle + 'left: 30; top: 140px;');
    userInterface.appendDiv('collision_detection_overlay', 'nsi', window.generalstyle + 'left: 30; top: 155px;');
    userInterface.appendDiv('collision_radius_multiplier_overlay', 'nsi', window.generalstyle + 'left: 30; top: 170px;');
    userInterface.appendDiv('huntprey_overlay', 'nsi', window.generalstyle + 'left: 30; top: 185px;');
    userInterface.appendDiv('defence_overlay', 'nsi', window.generalstyle + 'left: 30; top: 200px;');
    userInterface.appendDiv('resetzoom_overlay', 'nsi', window.generalstyle + 'left: 30; top: 215px;');
    userInterface.appendDiv('scroll_overlay', 'nsi', window.generalstyle + 'left: 30; top: 230px;');
    userInterface.appendDiv('quickResp_overlay', 'nsi', window.generalstyle + 'left: 30; top: 245px;');
    userInterface.appendDiv('changeskin_overlay', 'nsi', window.generalstyle + 'left: 30; top: 260px;');
    userInterface.appendDiv('quittomenu_overlay', 'nsi', window.generalstyle + 'left: 30; top: 275px;');

    // Bottom right
    userInterface.appendDiv('position_overlay', 'nsi', window.generalstyle + 'right: 30; bottom: 120px;');
    userInterface.appendDiv('ip_overlay', 'nsi', window.generalstyle + 'right: 30; bottom: 150px;');
    userInterface.appendDiv('fps_overlay', 'nsi', window.generalstyle + 'right: 30; bottom: 170px;');

    // Listener for mouse wheel scroll - used for setZoom function
    document.body.addEventListener('mousewheel', canvas.setZoom);
    document.body.addEventListener('DOMMouseScroll', canvas.setZoom);

    // Set render mode
    if (window.mobileRender) {
        canvas.setBackground('data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs');
        window.render_mode = 1;
    } else {
        canvas.setBackground();
        window.render_mode = 2;
    }

    // Unblocks all skins without the need for FB sharing.
    window.localStorage.setItem('edttsg', '1');

    // Remove social
    window.social.remove();

    // Start!
    bot.launchBot();
    window.startInterval = setInterval(bot.startBot, 1000);
})();
