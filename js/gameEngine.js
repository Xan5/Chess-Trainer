function gameEngine(options) {
    options = options || {}
    var game = new Chess();
    var board, promote_to, promoting, piece_theme, promotion_dialog, promotionMove, scoreBar, lastScore = 0;
    /// Loading Stockfish via Web Workers.
    var engine = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'js/stockfish.js');
    var engineStatus = {};
    var displayScore = false;
    var time = { wtime: 300000, btime: 300000, winc: 2000, binc: 2000 };
    var playerColor = 'white';
    var isEngineRunning = false;
    var announced_game_over;
    piece_theme = '../img/chesspieces/wikipedia/{piece}.png';
    fen = 'start';
    promotion_dialog = $('#promotion-dialog');
    promoting = false;

    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor == 'white' ? /^b/ : /^w/
            if (game.game_over() ||
                piece.search(re) !== -1 || promoting === true) {
                return false;
            }
    };

    setInterval(function ()
    {
        if (announced_game_over) {
            return;
        }
        
        if (game.game_over()) {
            announced_game_over = true;
            alert("Game Over");
        }
    }, 1000);

    function uciCmd(cmd, which) {
        console.log("UCI: " + cmd);
        
        (which || engine).postMessage(cmd);
    }
    uciCmd('uci');

    scoreBar = $('#scoreBar').children().find('.scoreBarInner');

    promotion_dialog = $('#promotion-dialog');
    $("#promote-to").selectable({
        stop: function() {
          $( ".ui-selected", this ).each(function() {
            var selectable = $('#promote-to li');
            var index = selectable.index(this);
            if (index > -1) {
              var promote_to_html = selectable[index].innerHTML;
              var span = $('<div>' + promote_to_html + '</div>').find('span');
              promote_to = span[0].innerHTML;
            }
            promotion_dialog.dialog('close');
            $('.ui-selectee').removeClass('ui-selected');
            board.position(game.fen(), false);
          });
        }
      });

    function displayStatus() {
        var status = '';
        var score = parseFloat(engineStatus.score);
        
        if(engineStatus.search) {
            if(engineStatus.score && displayScore) {
                var status = '';
                var score = parseFloat(engineStatus.score);
                if(playerColor == 'black') score *= -1;
                if (score > 20) score = 20;
                if (score < -20) score = -20;
                score += 20;
                score *= 15;
                lastScore = score;
                
                setScoreBar(score);

                status += (engineStatus.score.substr(0, 4) === "Mate" ? " " : ' Score: ') + engineStatus.score;
                $('#engineStatus').html(status);
            }
        } 
    }
    
    function setScoreBar(value){
        var scoreString;
        if(value) scoreString = parseFloat(value) + "px";
        else scoreString = "0px";
        if(scoreString != undefined)
        scoreBar.animate({ left: scoreString}, 100);
        else
        scoreBar.animate({ left: "300px"}, 100);
    }

    function getMoves() {
        var moves = '';
        var history = game.history({verbose: true});
        
        for(var i = 0; i < history.length; ++i) {
            var move = history[i];
            moves += ' ' + move.from + move.to + (move.promotion ? move.promotion : '');
            
        }
        return moves;
    }

    function prepareMove() {
        $('#pgn').text(game.pgn());
        //board.position(game.fen());
        var turn = game.turn() == 'w' ? 'white' : 'black';
        if(!game.game_over()) {
            if(turn != playerColor) {
                if(fen === 'start')
                    uciCmd('position startpos moves' + getMoves());
                else uciCmd('position fen '+ fen + ' moves' + getMoves());

                if (time && time.wtime) {
                    uciCmd("go " + (time.depth ? "depth " + time.depth : "") + " wtime " + time.wtime + " winc " + time.winc + " btime " + time.btime + " binc " + time.binc);
                } else {
                    uciCmd("go " + (time.depth ? "depth " + 0: ""));
                }
                isEngineRunning = true;
            }
            
            /*if(turn == playerColor) {
                uciCmd('position startpos moves' + getMoves());
                
                if (time && time.wtime) {
                    uciCmd("go " + (time.depth ? "depth " + time.depth : "") + " wtime " + time.wtime + " winc " + time.winc + " btime " + time.btime + " binc " + time.binc);
                } else {
                    uciCmd("go " + (time.depth ? "depth " + time.depth : ""));
                }
                isEngineRunning = true;
            }*/
        }
    }
   
    engine.onmessage = function(event) {
        var line;
        
        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }
        console.log("Reply: " + line)
        if(line == 'uciok') {
            engineStatus.engineLoaded = true;
        } else if(line == 'readyok') {
            engineStatus.engineReady = true;
        } else {
            var match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            //console.log(match);
            /// Did the AI move?
            if(match) {
                isEngineRunning = false;
                game.move({from: match[1], to: match[2], promotion: match[3]});
                board.position(game.fen());///fixed snapping on prepare move
                prepareMove();
            /// Is it sending feedback?
            } else if(match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/)) {
                engineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
            }
            
            /// Is it sending feed back with a score?
            if(match = line.match(/^info .*\bscore (\w+) (-?\d+)/)) {
                var score = parseInt(match[2]) * (game.turn() == 'w' ? 1 : -1);
                /// Is it measuring in centipawns?
                if(match[1] == 'cp') {
                    engineStatus.score = (score / 100.0).toFixed(2);
                /// Did it find a mate?
                } else if(match[1] == 'mate') {
                    //engineStatus.score = 'Mate in ' + Math.abs(score);
                }
                
                /// Is the score bounded?
                if(match = line.match(/\b(upper|lower)bound\b/)) {
                    //engineStatus.score = ((match[1] == 'upper') == (game.turn() == 'w') ? '<= ' : '>= ') + engineStatus.score
                }
            }
        }
        displayStatus();
    };

    var removeGreySquares = function() {
        $('#board .square-55d63').css('background', '');
      };
      
      var greySquare = function(square) {
        var squareEl = $('#board .square-' + square);
        
        var background = '#a9a9a9';
        if (squareEl.hasClass('black-3c85d') === true) {
          background = '#696969';
        }
      
        squareEl.css('background', background);
      };

    var onDrop = function(source, target) {
        //removeGreySquares();

        var move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });

        // illegal move
        if (move === null) return 'snapback';
        else game.undo();

        var source_rank = source.substring(2,1);
        var target_rank = target.substring(2,1);
        var piece = game.get(source).type;

        if (piece === 'p' &&
            ((source_rank === '7' && target_rank === '8') || (source_rank === '2' && target_rank === '1'))) {
            promoting = true;
            promotionMove = move;

            // get piece images
            $('.promotion-piece-q').attr('src', getImgSrc('q'));
            $('.promotion-piece-r').attr('src', getImgSrc('r'));
            $('.promotion-piece-n').attr('src', getImgSrc('n'));
            $('.promotion-piece-b').attr('src', getImgSrc('b'));

            //show the select piece to promote to dialog
            promotion_dialog.dialog({
                modal: true,
                height: 100,
                width: 400,
                resizable: true,
                draggable: false,
                close: onDialogClose,
                closeOnEscape: false,
                dialogClass: 'noTitleStuff'
            }).dialog('widget').position({
                of: $('#board'),
                my: 'middle middle',
                at: 'middle middle',
            });
            return;
        }
        game.move(move);
        prepareMove();
    };

    var onDialogClose = function() {
        //console.log(promote_to);
        promoting = false;
        promotionMove.promotion = promote_to;
        game.move(promotionMove);
        prepareMove();
      }

    function getImgSrc(piece) {
        return piece_theme.replace('{piece}', game.turn() + piece.toLocaleUpperCase());
    }

    var onMouseoverSquare = function(square, piece) {
        // get list of possible moves for this square
        var moves = game.moves({
          square: square,
          verbose: true
        });
      
        // exit if there are no moves available for this square
        if (moves.length === 0) return;
      
        // highlight the square they moused over
        greySquare(square);
      
        // highlight the possible squares for this piece
        for (var i = 0; i < moves.length; i++) {
          greySquare(moves[i].to);
        }
      };
      
      var onMouseoutSquare = function(square, piece) {
        removeGreySquares();
      };


    // update the board position after the piece snap
    // for castling, en passant, pawn promotion
    var onSnapEnd = function() {
        board.position(game.fen());
    };

    var cfg = {
        //showErrors: true,
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        pieceTheme: piece_theme,
        //onMouseoutSquare: onMouseoutSquare,//
        //onMouseoverSquare: onMouseoverSquare,//
        onSnapEnd: onSnapEnd

    };

    board = new ChessBoard('board', cfg);


    return {
        reset: function() {
            game.reset();
            uciCmd('setoption name Contempt value 0');
            //uciCmd('setoption name Skill Level value 20');
            this.setSkillLevel(0);
            uciCmd('setoption name King Safety value 0'); /// Agressive 100 (it's now symetric)
        },
        loadPgn: function(pgn) { game.load_pgn(pgn); },
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },
        setSkillLevel: function(skill) {
            var max_err,
                err_prob,
                difficulty_slider;
            
            if (skill < 0) {
                skill = 0;
            }
            if (skill > 20) {
                skill = 20;
            }
            
            time.level = skill;
            
            /// Change thinking depth allowance.
            if (skill < 5) {
                time.depth = "1";
            } else if (skill < 10) {
                time.depth = "2";
            } else if (skill < 15) {
                time.depth = "3";
            } else {
                /// Let the engine decide.
                time.depth = "";
            }
            
            uciCmd('setoption name Skill Level value ' + skill);
            
            ///Stockfish level 20 these numbers have no effect on level 20.
            /// Level 0 starts at 1
            err_prob = Math.round((skill * 6.35) + 1);
            /// Level 0 starts at 10
            max_err = Math.round((skill * -0.5) + 10);
            
            uciCmd('setoption name Skill Level Maximum Error value ' + max_err);
            uciCmd('setoption name Skill Level Probability value ' + err_prob);
        },
        setTime: function(baseTime, inc) {
            time = { wtime: baseTime * 1000, btime: baseTime * 1000, winc: inc * 1000, binc: inc * 1000 };
        },
        setDepth: function(depth) {
            time = { depth: depth };
        },
        setNodes: function(nodes) {
            time = { nodes: nodes };
        },
        setContempt: function(contempt) {
            uciCmd('setoption name Contempt value ' + contempt);
        },
        setAggressiveness: function(value) {
            uciCmd('setoption name Aggressiveness value ' + value);
        },
        setDisplayScore: function(flag) {
            displayScore = flag;
            if(!flag)  $("#scoreBar").hide();
            else $("#scoreBar").show();
            displayStatus();
        },
        start: function() {
            uciCmd('ucinewgame');
            uciCmd('isready');
            uciCmd("position startpos fen "+ fen);
            game.load(fen);
            board.position(fen);
            engineStatus.engineReady = false;
            engineStatus.search = null;
            displayStatus();
            promoting = false;
            prepareMove();
            announced_game_over = false;
            setScoreBar(300);
        },
        undo: function() {
            if(isEngineRunning)
                return false;
            game.undo();
            game.undo();
            board.position(game.fen());
            promoting = false;
            engineStatus.search = null;
            displayStatus();
            prepareMove();
            return true;
        }
    };
}