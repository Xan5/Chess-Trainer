function gameEngine(options) {
    options = options || {}
    var game = new Chess();
    var board, promoteTo, promoting, piece_theme, promotionDialog, promotionMove, scoreBar;
    var engine = typeof STOCKFISH === "function" ? STOCKFISH() : new Worker(options.stockfishjs || 'js/stockfish.js');
    var engineStatus = {};
    var displayScore = false;
    var depth = "";
    var playerColor = 'white';
    var isEngineRunning = false;
    var announcedGameOver;
    piece_theme = '../img/chesspieces/wikipedia/{piece}.png';
    fen = 'start';
    promoting = false;

    function uciCmd(cmd, which) {
        console.log("UCI: " + cmd); //Debug
        (which || engine).postMessage(cmd);
    }
    uciCmd('uci');

    //#region Dialogs/Buttons setup
    var startDialog = $( "#start-dialog" );
    startDialog.dialog({ 
        autoOpen: false,
        modal: true,
        draggable: false,
        minHeight: 250
        });
    $( ".new-game-button" ).click(function() {
        $( "#start-dialog" ).dialog( "open"
         ).dialog('widget').position({
             my: 'middle',
             at: 'middle',
             of: $('#board'),
            });
    });
    $(".btn-group > .btn").click(function(){
        $(this).addClass("active").siblings().removeClass("active");
    });

    var endDialog = $( "#end-dialog" );
    endDialog.dialog({ 
        autoOpen: false,
        modal: true,
        draggable: false,
        minHeight: 250
        });
    $( "#analyzeButton" ).click(function() {
        endDialog.dialog("close");
        var pgn = game.pgn();
        var location = window.location.href;
        
        window.location.href = location.replace( 'play', 'analyze/'+ pgn);
    });
    
    $('.contextmenu').hide();
    $('body').contextmenu(function(e){
        $('.contextmenu').show();
        $('.contextmenu').offset({left:e.pageX,top:e.pageY});
    });
    $('body').click(function(){
        $('.contextmenu').hide();
    });
 
    function getImgSrc(piece) {
        return piece_theme.replace('{piece}', game.turn() + piece.toLocaleUpperCase());
    }

    promotionDialog = $('#promotion-dialog');
    $("#promote-to").selectable({
        stop: function() {
          $( ".ui-selected", this ).each(function() {
            var selectable = $('#promote-to li');
            var index = selectable.index(this);
            if (index > -1) {
              var promoteToHtml = selectable[index].innerHTML;
              var span = $('<div>' + promoteToHtml + '</div>').find('span');
              promoteTo = span[0].innerHTML;
            }
            promotionDialog.dialog('close');
            $('.ui-selectee').removeClass('ui-selected');
            board.position(game.fen(), false);
          });
        }
    });
    $('.promotion-piece-q').attr('src', getImgSrc('q'));
    $('.promotion-piece-r').attr('src', getImgSrc('r'));
    $('.promotion-piece-n').attr('src', getImgSrc('n'));
    $('.promotion-piece-b').attr('src', getImgSrc('b'));
    var onDialogClose = function() {
        promoting = false;
        promotionMove.promotion = promoteTo;
        game.move(promotionMove);
        prepareMove();
    }
    promotionDialog.dialog({
        autoOpen: false,
        modal: true,
        height: 100,
        width: 400,
        resizable: false,
        draggable: false,
        close: onDialogClose,
        closeOnEscape: false,
        dialogClass: 'noTitleStuff'
    });
    //#endregion
      
    //#region Scorebar and Score
    scoreBar = $('#scoreBar').children().find('.scoreBarInner');

    function setScoreBar(value){
        var scoreString;
        if(value) scoreString = parseFloat(value) + "px";
        else scoreString = "0px";
        if(scoreString != undefined)
        scoreBar.animate({ left: scoreString}, 100);
        else
        scoreBar.animate({ left: "300px"}, 100);
    }

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
                score *= 13.45;
                lastScore = score;
                
                setScoreBar(score);

                status += (engineStatus.score.substr(0, 4) === "Mate" ? " " : ' Score: ') + engineStatus.score;
                $('#engineStatus').html(status);
            }
        } 
    }
    //#endregion

    //Check if game ended
    function checkGameOver(){
        if (announcedGameOver) {
            return;
        }
        if (game.game_over()) {
            var info, winner;
            if(game.in_stalemate()){
                info = "Stalemate";
            }else info = " ";
            announcedGameOver = true;
            if(game.in_draw()){
                winner = "Draw";
                $('#end-info').html(info);
                $('#end-winner').html(winner);
                endDialog.dialog('open').dialog('widget').position({
                    my: 'middle',
                    at: 'middle',
                    of: $('#board'),
                   });
            }
            if(game.in_checkmate()){
                info = "Checkmate";
                winner = game.turn() == 'w' ? 'Black is victorious!' : 'White is victorious!';
                $('#end-info').html(info);
                $('#end-winner').html(winner);
                endDialog.dialog('open').dialog('widget').position({
                    my: 'middle',
                    at: 'middle',
                    of: $('#board'),
                   });
            }
        }
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

    //Send query to engine
    function prepareMove() {
        //board.position(game.fen());
        var turn = game.turn() == 'w' ? 'white' : 'black';
        if(!game.game_over()) {
            if(turn != playerColor) {
                if(fen === 'start')
                    uciCmd('position startpos moves' + getMoves());
                else uciCmd('position fen '+ fen + ' moves' + getMoves());
                uciCmd("go " + (depth ? "depth " + depth: ""));
                isEngineRunning = true;
            }
            
            if(turn == playerColor) {
                if(fen === 'start')
                uciCmd('position startpos moves' + getMoves());
                else uciCmd('position fen '+ fen + ' moves' + getMoves());
                uciCmd("go " + (depth ? "depth " + depth : ""));
                isEngineRunning = true;
            }
        }
    }
   
    //Engine response
    engine.onmessage = function(event) {
        var line;
        
        if (event && typeof event === "object") {
            line = event.data;
        } else {
            line = event;
        }
        //console.log("Reply: " + line);  //Debug
        if(line == 'uciok') {
            engineStatus.engineLoaded = true;
        } else if(line == 'readyok') {
            engineStatus.engineReady = true;
        } else {
            var match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            //console.log(match);
            //Move
            if(match) {
                isEngineRunning = false;
                var turn = game.turn() == 'w' ? 'white' : 'black';
                if(turn != playerColor) {
                    var move = game.move({
                        from: match[1],
                        to: match[2],
                        promotion: match[3]
                    });
                    game.move(move);
                    addMoveToList();
                    board.position(game.fen());///fixed snapping on prepare move
                    prepareMove();
                }
            //Info
            } else if(match = line.match(/^info .*\bdepth (\d+) .*\bnps (\d+)/)) {
                engineStatus.search = 'Depth: ' + match[1] + ' Nps: ' + match[2];
            }
            
            //Score
            if(match = line.match(/^info .*\bscore (\w+) (-?\d+)/)) {
                var score = parseInt(match[2]) * (game.turn() == 'w' ? 1 : -1);
                if(match[1] == 'cp') {
                    engineStatus.score = (score / 100.0).toFixed(2);
                } else if(match[1] == 'mate') {
                    engineStatus.score = 'Mate in ' + Math.abs(score);
                }
                
                /// Is the score bounded?
                //if(match = line.match(/\b(upper|lower)bound\b/)) {
                    //engineStatus.score = ((match[1] == 'upper') == (game.turn() == 'w') ? '<= ' : '>= ') + engineStatus.score
                //}
            }
        }
        displayStatus();
    };

    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor == 'white' ? /^b/ : /^w/;
        if (game.game_over() ||
                piece.search(re) !== -1 || promoting === true) {
                return false;
            }
    };

    var onDrop = function(source, target) {
        //removeGreySquares();
        
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q'
        });
        
        //Check for illegal move
        if (move === null) return 'snapback';
        else game.undo();
        
        var source_rank = source.substring(2,1);
        var target_rank = target.substring(2,1);
        var piece = game.get(source).type;
        
        //Check for promotion
        if (piece === 'p' &&
        ((source_rank === '7' && target_rank === '8') || (source_rank === '2' && target_rank === '1'))) {
            promoting = true;
            promotionMove = move;
            
            promotionDialog.dialog("open").dialog('widget').position({
                my: 'middle',
                at: 'middle',
                of: $('#board'),
            });
            return;
        }
        //Make move
        game.move(move);
        addMoveToList();
        
        prepareMove();
    };
    
    var onSnapEnd = function() {
        board.position(game.fen());
    };

    var onMoveEnd = function() {
        checkGameOver();
    };

    function addMoveToList(){
        var moves = game.history({verbose: true});
        var move = moves[moves.length -1];
        $("#pgn").append("<li class='cell'>" + parseInt(moves.length) + ". " + move.from + move.to + (move.promotion ? move.promotion : '') +"</li>");
        $('#pgn').animate({scrollTop: $('#pgn').prop("scrollHeight")}, 500);
    }

    function removeMoveFromList(){
        $("#pgn li:last").remove();
    }

    //#region Legal moves highlight
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

    var onMouseoverSquare = function(square, piece) {
    var moves = game.moves({
        square: square,
        verbose: true
    });

    if (moves.length === 0) return;

    greySquare(square);

    for (var i = 0; i < moves.length; i++) {
        greySquare(moves[i].to);
    }
    };

    var onMouseoutSquare = function(square, piece) {
    removeGreySquares();
    };
    //#endregion

    var cfg = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        pieceTheme: piece_theme,
        //onMouseoutSquare: onMouseoutSquare,//
        //onMouseoverSquare: onMouseoverSquare,//
        onSnapEnd: onSnapEnd,
        onMoveEnd: onMoveEnd
    };

    board = new ChessBoard('board', cfg);


    return {
        reset: function() {
            game.reset();
            uciCmd('setoption name Contempt value 0');
            uciCmd('setoption name Skill Level value 20');
            this.setSkillLevel(0);
            uciCmd('setoption name King Safety value 0'); /// Agressive 100 (it's now symetric)
        },
        getFEN: function(){
            return game.fen();
        },
        getPGN: function(){
            console.log(pgn);
            return game.pgn();
        },
        loadPgn: function(pgn) { game.load_pgn(pgn); },
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },
        setSkillLevel: function(skill) {
            var max_err, err_prob;
            
            skill = skill * 4;
            
            /// Change thinking depth allowance.
            if (skill < 5) {
                depth = "1";
            } else if (skill < 10) {
                depth = "2";
            } else if (skill < 15) {
                depth = "3";
            } else if (skill < 20) {
                depth = "4";
            } else {
                /// Let the engine decide.
                depth = "";
            }
            
            uciCmd('setoption name Skill Level value ' + skill);
            
            err_prob = Math.round((skill * 6.35) + 1);
            max_err = Math.round((skill * -0.5) + 10);
            
            uciCmd('setoption name Skill Level Maximum Error value ' + max_err);
            uciCmd('setoption name Skill Level Probability value ' + err_prob);
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
            $("#pgn li").remove();
            displayStatus();
            promoting = false;
            prepareMove();
            announcedGameOver = false;
            setScoreBar(269);
            startDialog.dialog('close');
            endDialog.dialog("close");

        },
        undo: function() {
            if(isEngineRunning)
                return false;
            game.undo();
            game.undo();
            removeMoveFromList();
            removeMoveFromList();
            board.position(game.fen());
            promoting = false;
            engineStatus.search = null;
            prepareMove();
            displayStatus();
            return true;
        }
    };
}