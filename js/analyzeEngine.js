function analyzeEngine() {
    var game = new Chess();
    var history, historyLength = 0, moveNumber = 0, validHistory = true, invalidMoveNumber = -1;
    var board, promoteTo, promoting, pieceTheme, promotionMove, scoreBar, lastProposedMove = null;
    var engine = new Worker('js/stockfish.js');
    var engineStatus = {};
    var depth = "";
    var playerColor = 'white';
    pieceTheme = '../img/chesspieces/wikipedia/{piece}.png';
    fen = 'start';
    promoting = false;
    var boardSel = $('#board');

    function uciCmd(cmd) {
        engine.postMessage(cmd);
    }
    uciCmd('uci');

    //#region Dialogs/Buttons setup    
    $( "#firstButton" ).click(function() {
        for(var i = 0 ; i <= moveNumber; ++i){
            game.undo();
        }
        moveNumber = 0;
        validHistory = true;
        $("#pgn li").remove();        
        board.position(game.fen());
        clearHighLight();
        prepareMove();
    });
    $( "#previousButton" ).click(function() {
        game.undo();
        removeMoveFromList();
        if(moveNumber > 0){
            moveNumber--;
            if(moveNumber > 0)
                checkIfMoveInHistory();
        }
        board.position(game.fen());
        clearHighLight();
        prepareMove();
    });
    $( "#nextButton" ).click(function() {
        if(!validHistory) return;
        if(moveNumber >= historyLength) return;
        moveNext(history);
        addMoveToList();
        board.position(game.fen());
        clearHighLight();
        prepareMove();
    });
    $( "#lastButton" ).click(function() {
        if(!validHistory) return;
        if(moveNumber > historyLength) return;
        for(var i = moveNumber ; i < historyLength; ++i){
            moveNext(history);  
        }
        addAllmovesToList();
        board.position(game.fen());
        clearHighLight();
        prepareMove();
    });

    $( "#load-dialog" ).dialog({ 
        autoOpen: false,
        modal: true,
        draggable: false,
        minHeight: 281,
        width: 320,
    });
    $( "#loadButton" ).click(function() {
        $( "#load-dialog" ).dialog( "open"
            ).dialog('widget').position({
                my: 'middle',
                at: 'middle',
                of: $('#board'),
            });
    });
    $( "#loadFENButton" ).click(function() {
        var fen = $("#load-fen").val();
        $( "#load-dialog" ).dialog("close");
        loadFEN(fen);
    });
    $( "#loadPGNButton" ).click(function() {
        var pgn = $("#load-pgn").val();
        $( "#load-dialog" ).dialog("close");
        loadPGN(pgn);
    });
    $( "#error-dialog" ).dialog({ 
        autoOpen: false,
        modal: true,
        draggable: false,
        minHeight: 281,
        width: 320,
    });
    $( "#okButton" ).click(function() {
        $( "#error-dialog" ).dialog("close");
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
        if(engineStatus.search) {
            if(engineStatus.score) {
                var status = '';
                var score = parseFloat(engineStatus.score);
                if(game.turn() == 'black') score *= -1;
                if (score > 20) score = 20;
                if (score < -20) score = -20;
                score += 20;
                score *= 13.45;
                lastScore = score;
                setScoreBar(score);
                status += (engineStatus.score.substr(0, 4) === "Mate" ? " " : ' Score: ') + (playerColor === 'black' && engineStatus.score.substr(0, 4) !== "Mate"? "-":"") + engineStatus.score;
                $('#engineStatus').html(status);
            }
        } 
    }
    //#endregion

    //Check if game ended
    function checkGameOver(){
        if (game.game_over()) {
            var winner;
            if(game.in_stalemate()){
                info = "Stalemate";
            }
            announcedGameOver = true;
            if(game.in_draw()){
                winner = "Draw";
                if(game.in_stalemate()){
                    winner = "Stalemate";
                }
                $('#engineStatus').html(winner);
            }
            if(game.in_checkmate()){
                winner = game.turn() == 'w' ? 'Black won!' : 'White won!';
                $('#engineStatus').html(winner);
            }
        }
    }

    var checkIfMoveInHistory = function(){
        if(historyLength < moveNumber) {
            validHistory = false;
            invalidMoveNumber = moveNumber -1;
            $( "#nextButton" ).addClass("disabled").removeClass("button-panel");
            $( "#lastButton" ).addClass("disabled").removeClass("button-panel");    
            return;
        }
        var moves = game.history({verbose: true});
        var move = moves[moves.length -1];
        if(history[moveNumber -1].from === move.from && 
            history[moveNumber -1].to === move.to &&
            history[moveNumber -1].promotion === move.promotion) {
            validHistory = true;
            invalidMoveNumber = -1;
            $( "#nextButton" ).addClass("button-panel").removeClass("disabled");
            $( "#lastButton" ).addClass("button-panel").removeClass("disabled");    
            return;
        }
        validHistory = false;
        invalidMoveNumber = moveNumber;
        $( "#nextButton" ).addClass("disabled").removeClass("button-panel");
        $( "#lastButton" ).addClass("disabled").removeClass("button-panel");

    }

    function moveNext(moves) {
        if(historyLength === moveNumber) return;
        var sourceNextMove = moves[moveNumber].from;
        var targetNextMove = moves[moveNumber].to;
        var targetPromotion = moves[moveNumber].promotion;
        moveNumber++;
        game.move({
            from: sourceNextMove,
            to: targetNextMove,
            promotion: targetPromotion ? targetPromotion : ''});
    };

    function getMoves() {
        var moves = '';
        var actualHistory = game.history({verbose: true});
        
        for(var i = 0; i < actualHistory.length; ++i) {
            var move = actualHistory[i];
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
            }
            
            if(turn == playerColor) {
                if(fen === 'start')
                uciCmd('position startpos moves' + getMoves());
                else uciCmd('position fen '+ fen + ' moves' + getMoves());
                uciCmd("go " + (depth ? "depth " + depth : ""));
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
        if(line == 'uciok') {
            engineStatus.engineLoaded = true;
        } else if(line == 'readyok') {
            engineStatus.engineReady = true;
        } else {
            var match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            //Move
            if(match) {
                    var move = {
                        from: match[1],
                        to: match[2],
                        promotion: match[3]
                    };
                    clearHighLight();
                    boardSel.find('.square-'+ move.from).addClass('square-highlight');
                    boardSel.find('.square-'+ move.to).addClass('square-highlight');
                    lastProposedMove = move;

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
            displayStatus();
        }
    };

    function clearHighLight(){
        if(lastProposedMove !== null){
            $('#board').find('.square-55d63').removeClass('square-highlight');
            boardSel.find('.square-' + lastProposedMove.from).removeClass(".square-highlight");
            boardSel.find('.square-' + lastProposedMove.to).removeClass(".square-highlight");
        }
    }

    var onDragStart = function(source, piece, position, orientation) {
        var re = playerColor == 'white' ? /^b/ : /^w/;
        if (game.game_over() ||
        (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
        (game.turn() === 'b' && piece.search(/^w/) !== -1) || 
        promoting === true) {
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
        moveNumber++;
        checkIfMoveInHistory();
        checkGameOver();

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

    function addAllmovesToList(){
        var temp = "";
        for(var i = 0; i < historyLength; ++i){
            temp += "<li class='cell'>" + parseInt(i+1) + ". " + history[i].from + history[i].to + (history[i].promotion ? history[i].promotion : '') +"</li>";
        }
        $("#pgn").append(temp);
        $('#pgn').animate({scrollTop: $('#pgn').prop("scrollHeight")}, 500);
    }

    function removeMoveFromList(){
        $("#pgn li:last").remove();
    }

    function loadPGN(_pgn){
        $("#pgn li").remove();        
        var options = {
            sloppy: true
          };
        try{
            game.load_pgn(_pgn.match(/\d+\W.\w+\s\w+\s\d+.\w+.+/)[0],options);
        }
        catch(e){
            $('#error-desc').html("PGN is empty or has wrong format.");
            $( "#load-dialog" ).dialog("close");
            $( "#error-dialog" ).dialog( "open"
            ).dialog('widget').position({
                my: 'middle',
                at: 'middle',
                of: $('#board'),
            });
            game.reset();
            return;
        }

        var shallowHistory = game.history({verbose: true})
        history = jQuery.extend( true, {}, shallowHistory);
        historyLength = shallowHistory.length;
        for(var i = 0; i < historyLength; ++i){
            game.undo();
        }

        moveNumber = 0; 
        for(var i = 0; i < historyLength; ++i){
            moveNext(history);  
        }
       
        addAllmovesToList();
        validHistory = true;
        fen = "start";
        $( "#start-dialog" ).dialog("close");
        $( "#nextButton" ).addClass("button-panel").removeClass("disabled");
        $( "#lastButton" ).addClass("button-panel").removeClass("disabled");
        clearHighLight();

        board.position(game.fen());
        prepareMove();
    }

    function loadFEN(_fen){
        $("#pgn li").remove();
        fen = _fen;
        var result = game.load(_fen); 
        if(result == false){
            $('#error-desc').html("FEN is empty or has wrong format.");
            $( "#load-dialog" ).dialog("close");
            $( "#error-dialog" ).dialog( "open"
            ).dialog('widget').position({
                my: 'middle',
                at: 'middle',
                of: $('#board'),
            });
            game.reset();
            return;
        }
        fen = _fen;
        moveNumber = 0;
        history = null;
        historyLength = 0;
        board.position(_fen);
        $( "#nextButton" ).addClass("disabled").removeClass("button-panel");
        $( "#lastButton" ).addClass("disabled").removeClass("button-panel");
        clearHighLight();
        prepareMove();
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
            uciCmd('setoption name King Safety value 0'); /// Agressive 100 (it's now symetric)
        },
        getFEN: function(){
            return game.fen();
        },
        getPGN: function(){
            var pgn = game.pgn();
            pgn = pgn.replace(/(?<=(\d+\W))\s/g, '');
            return pgn;
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
        start: function() {
            uciCmd('ucinewgame');
            uciCmd('isready');
            if(window.location.href.match(/1.+/) !== null){
                var pgn = window.location.href.match(/1.+/)[0];
                pgn = pgn.replace(/(%20)/g,' ');
                pgn = pgn.replace(/(#)/g,'');
                var options = {
                    sloppy: true
                  };
                game.load_pgn(pgn,options);
                board.position(game.fen());
            }
            engineStatus.engineReady = false;
            engineStatus.search = null;
            $("#pgn li").remove();
            promoting = false;
            prepareMove();
            displayStatus();
            announcedGameOver = false;
            setScoreBar(269);
            historyLength = 0;
            clearHighLight();
            $( "#nextButton" ).addClass("disabled").removeClass("button-panel");
            $( "#lastButton" ).addClass("disabled").removeClass("button-panel");
        }
    };
}