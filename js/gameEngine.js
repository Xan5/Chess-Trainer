function gameEngine() {
    var game = new Chess();
    var board, promoteTo, promoting, pieceTheme, promotionMove, scoreBar;
    var engine = new Worker('js/stockfish.js');
    var engineStatus = {};
    var displayScore = false;
    var depth = "";
    var playerColor = 'white';
    var isEngineRunning = false;
    var announcedGameOver;
    pieceTheme = '../img/chesspieces/wikipedia/{piece}.png';
    fen = 'start';
    promoting = false;

    function uciCmd(cmd) {
        //console.log("UCI: " + cmd); //Debug
        engine.postMessage(cmd);
    }
    uciCmd('uci');

    //#region Dialogs/Buttons setup
    $( "#start-dialog" ).dialog({ 
        autoOpen: false,
        modal: true,
        draggable: false,
        minHeight: 281,
        width: 320
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

    $( "#end-dialog" ).dialog({ 
        autoOpen: false,
        modal: true,
        draggable: false,
        minHeight: 281,
        width: 320,
        });
    $( "#analyzeButton" ).click(function() {
        $( "#end-dialog" ).dialog("close");
        var pgn = game.pgn();
        var location = window.location.href;
        pgn = pgn.replace(/(?<=(\d+\W))\s/g, '');
        window.location.href = location.replace( 'playai', 'analyze/'+ pgn);
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
        return pieceTheme.replace('{piece}', game.turn() + piece.toLocaleUpperCase());
    }

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
            $('#promotion-dialog').dialog('close');
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
    $('#promotion-dialog').dialog({
        autoOpen: false,
        modal: true,
        height: 100,
        width: 320,
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
        if(score == undefined) return;
        if(engineStatus.search) {
            if(engineStatus.score && displayScore) {
                var status = '';
                var score = parseFloat(engineStatus.score);
                var turn = game.turn() == 'w' ? 'white' : 'black';
                if(playerColor === 'black' ) {score *= -1;}
                if (score > 20) score = 20;
                if (score < -20) score = -20;
                score += 20;
                score *= 13.45;
                lastScore = score;
                setScoreBar(score);
                if(playerColor === 'black'){ engineStatus.score = engineStatus.score.replace('-', '') }
                status += (engineStatus.score.substr(0, 4) === "Mate" ? " " : ' Score: ') + (playerColor === 'black' && engineStatus.score.substr(0, 4) !== "Mate"? "-":"") + engineStatus.score;
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
                $( "#end-dialog" ).dialog('open').dialog('widget').position({
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
                $( "#end-dialog" ).dialog('open').dialog('widget').position({
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
                    board.position(game.fen());
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
            
            $('#promotion-dialog').dialog("open").dialog('widget').position({
                my: 'middle',
                at: 'middle',
                of: $('#board'),
            });
            return;
        }
        //Make move
        game.move(move);
        addMoveToList();
        checkGameOver();
        prepareMove();
    };
    // update the board position after the piece snap 
    // For castling, en passant, pawn promotion
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

    var cfg = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        pieceTheme: pieceTheme,

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
            uciCmd('setoption name King Safety value 0');
        },
        getFEN: function(){
            return game.fen();
        },
        getPGN: function(){
            var pgn = game.pgn();
            pgn = pgn.replace(/(?<=(\d+\W))\s/g, '');
            return pgn;
        },
        loadPgn: function(pgn) { game.load_pgn(pgn); },
        setPlayerColor: function(color) {
            playerColor = color;
            board.orientation(playerColor);
        },
        setSkillLevel: function(skill) {
            skill = skill * 4;
            
            if (skill < 5) {
                depth = "1";
            } else if (skill < 10) {
                depth = "2";
            } else if (skill < 15) {
                depth = "3";
            } else if (skill < 20) {
                depth = "4";
            } else {
                depth = ""; // Engine decides on depth
            }
            
            var maxError, errorProb;
            errorProb = Math.round((skill * 6.35) + 1);
            maxError = Math.round((skill * -0.5) + 10);
            
            uciCmd('setoption name Skill Level value ' + skill);
            uciCmd('setoption name Skill Level Maximum Error value ' + maxError);
            uciCmd('setoption name Skill Level Probability value ' + errorProb);
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
            uciCmd("ucinewgame");
            uciCmd("isready");
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
            $( "#start-dialog" ).dialog("close");
            $( "#end-dialog" ).dialog("close");

        },
        undo: function() {
            if(isEngineRunning){
                uciCmd("stop");
                return false;
            }
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