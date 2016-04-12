

function createDownloadHandler() {

    var $result = $('#crud-create .result');
    var $resultStatus = $result.find(' p.status span');
    var $resultBody = $result.find('pre');
    var $url = $('#create-url');
    var $notify = $('#create-notify');
    var $button = $('#crud-create button');

    function onFieldChange() {
    }

    function onSubmit() {

        var payload = {};

        if ($url.val() && $url.val().length > 0) {
            payload.url = $url.val();
        }
        if ($notify[0].checked) {
            payload.notify = true;
        }
		payload = JSON.stringify(payload, null, 2);

		$result.removeClass('error').removeClass('success');

        $.ajax({
            'method': 'POST',
            'url': 'downloads/',
            'data': payload,
            'headers': {
                'content-type': 'application/json'
            },
            'complete': function(xhr, textStatus) {
                $resultStatus.html(xhr.status);

                if (xhr.status !== 201) {
                    $result.addClass('error');
                    $resultBody.html(xhr.responseText);
                } else if (!xhr.responseJSON) {
                    $result.addClass('error');
                    $resultBody.html('The created document is expected in the response');
                } else {
                    $result.addClass('success');
                    var formatted = JSON.stringify(xhr.responseJSON, null, 2);
                    $resultBody.html(formatted);
                }
            }
        });
    }

//    $url.keyup(onFieldChange);
//    $notify.change(onFieldChange);
    $button.click(onSubmit);
};

function listDownloadHandler() {

    var crudTable = $('#crud-list-table').dataTable();
    var $crudListAlert = $('#crud-list-alert');

	$.ajax({
		'method': 'GET',
		'url': 'downloads/list',
		'complete': function(xhr, textStatus) {
			if (xhr.status !== 200) {
				//$result.addClass('error');
				//$resultBody.html(xhr.responseText);
				$crudListAlert.html(xhr.responseText);
			} else {
				var data = xhr.responseJSON;
				crudTable.fnClearTable();
				for(var i = 0; i < data.length; i++) {
					crudTable.fnAddData(
						[ data[i].url,
						  '<a href="'+data[i].filename+'">'+data[i].filename+'</a>',
						  data[i].created,
						  data[i].status,
						  data[i].notify,
						  data[i]._id
						]
					); 
				} // End For }, error: function(e){ console.log(e.responseText); } }); }
				crudTable.fnSort( [ [2,'desc'], [0,'asc'] ] );


			}
		}
	});

};

window.onload = function() {
    createDownloadHandler();
    listDownloadHandler();
};
