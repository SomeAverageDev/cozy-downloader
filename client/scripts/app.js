// refresh table from http://www.meadow.se/wordpress/refreshing-data-in-jquery-datatables/
const autoReloadTimer = 10000;

function stringShortener (str, maxSize) {
	if (typeof maxSize === 'undefined') {
		maxSize =  60;
	}
	if (str.length > maxSize && str.length > 10) {
		var half = (str.length-6)/2;
		if (half > (maxSize-6)/2) {
			half = (maxSize-6)/2;
		}
		var end = str.substr(-half);
		var start = str.substr(0, half);
		return start +'~~~~~~'+end;
	}
	return str;
};

function retryDownloadHelper(id) {
	updateMessage('Retry request submitted...');

	$.ajax({
		'method': 'GET',
		'url': 'downloads/retry/'+id,
		'complete': function(xhr, textStatus) {
			//console.log(xhr);
			setTimeout(function(){updateListDownloads();return true;}, 300);
			if (xhr.status !== 200) {
				updateMessage('Retry request error');
			} else {
				updateMessage('Retry request successful !');
			}
			return true;
		}
	});
	return false;
};

function deleteDownloadHelper (id) {
	updateMessage('Delete request submitted...');

	$.ajax({
		'method': 'DELETE',
		'url': 'downloads/delete/'+id,
		'complete': function(xhr, textStatus) {
			//console.log(xhr);
			setTimeout(function(){updateListDownloads();return true;}, 300);
			if (xhr.status !== 200) {
				updateMessage('Delete request error...');
			} else {
				updateMessage('Delete request successful !');
			}
			return true;
		}
	});
	return false;
};

function retrieveDownloadHelper (id) {
	window.location = 'downloads/'+id;
	return false;
};

function storeToFileDownloadHelper (id) {
	updateMessage('Store in File request submitted...');

	$.ajax({
		'method': 'PUT',
		'url': 'downloads/tofile/'+id,
		'complete': function(xhr, textStatus) {
			//console.log(xhr);
			setTimeout(function(){updateListDownloads();return true;}, 300);
			if (xhr.status == 206) {
				updateMessage('This download is already stored in Files !');
			} else if (xhr.status !== 200) {
				updateMessage('Store in File app request error...');
			} else {
				updateMessage('Store in File app request successful !');
			}
			return true;
		}
	});
	return false;
};

function initListDownloads() {
    var crudTable = $('#crud-list-table').dataTable({
        "bPaginate": false,
        "bFilter": false,
        "bInfo": false,
		"retrieve": true,
		"bJQueryUI": true,
		"sAjaxSource": 'downloads/list',
		"language": {
			"emptyTable": "You have not downloaded anything yet !"
			}
		}
	);
	return false;
};

function createDownloadHandler() {
    var $url = $('#create-url');
    var $notify = $('#create-notify');
    var $button = $('#new-url-form button');

    function onSubmit() {

		updateMessage('Download request submitted...');

		var formData = {
			'notify': false
		};

		// input validation
        if ($url.val() && $url.val().length > 0) {
            formData.url = $url.val();
        } else {
			// empty URL, no need to submit the form
			return false;
        }

        if ($notify[0].checked) {
            formData.notify = true;
        }

		// data json formating
		formData = JSON.stringify(formData, null, 2);

        $.ajax({
            'method': 'POST',
            'url': 'downloads/new',
            'data': formData,
            'headers': {
                'content-type': 'application/json'
            },
			'complete': function(xhr, textStatus) {
				setTimeout(function(){updateListDownloads();return true;}, 300);
				if (xhr.status !== 200) {
					updateMessage('Download request error : '+xhr.responseText);
                } else {
					updateMessage('Download request successful !');
                }
			}
        });

		$('#new-url-form')[0].reset();
		return true;
    }

    $button.click(onSubmit);
	return false;
};

function updateListDownloads() {
	var globalPourcentage = 100;

	$.getJSON('downloads/list', null, function( data )
	{
		var crudTable = $('#crud-list-table').dataTable();
		if (crudTable && data) {
			oSettings = crudTable.fnSettings();
			crudTable.fnClearTable(this);

			for (var i=0; i<data.length; i++)
			{
				data[i].pourcentage = parseInt(data[i].fileprogress/data[i].filesize*100);
				if (globalPourcentage > data[i].pourcentage) {
					globalPourcentage = data[i].pourcentage;
				}
				(isNaN(data[i].pourcentage)) ? (data[i].pourcentage = 0): '';

				var actions = '';
				actions += '<button type="button" class="btn btn-danger btn-sm" onClick="deleteDownloadHelper(\''+data[i]._id+'\')">Delete</button>&nbsp;';
				if (data[i].status === 'available') {
					actions += '<button type="button" class="btn btn-success btn-sm" onClick="retrieveDownloadHelper(\''+data[i]._id+'\')">Retrieve</button>&nbsp;';
					actions += '<button type="button" class="btn btn-success btn-sm" onClick="storeToFileDownloadHelper(\''+data[i]._id+'\')">Move to Files</button>&nbsp;';
				} else if (data[i].status !== 'pending') {
					actions += '<button type="button" class="btn btn-info btn-sm" onClick="retryDownloadHelper(\''+data[i]._id+'\')">Retry</button>';
				}

				crudTable.fnAddData(
					[ '<a target="_blank" href="'+data[i].url+'">'+stringShortener(data[i].url)+'</a>',
		//						  (data[i].status == 'available') ? '<a href="downloads/'+data[i]._id+'">'+data[i].filename.substring(0, 50)+'</a>' : '-',
					  (data[i].pourcentage>0) ? ('<div class="progress"><div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="'+ data[i].pourcentage+ '" aria-valuemin="0" aria-valuemax="100" style="min-width: 2em; width:'+data[i].pourcentage+'%">'+data[i].pourcentage+'%</div></div>'):'-',
		//			  (data[i].created) ? new Date(data[i].created).toLocaleString() : '-',
		//			  (data[i].updated) ? new Date(data[i].updated).toLocaleString() : '-',
					  '<img src="app/assets/images/'+data[i].status+'.png" title="'+data[i].status+'" />',
					  (data[i].fileprogress>0) ? filesize(data[i].fileprogress, {spacer:''}):'-',
					  //data[i].notify,
					  //'<img src="app/assets/images/delete.png" alt="delete" onClick="deleteDownloadHelper(\''+data[i]._id+'\')" />'
					  actions
		//					,	data[i].created
					]
				);
			}

			oSettings.aiDisplay = oSettings.aiDisplayMaster.slice();
			crudTable.fnDraw();

			if (data.length > 0 && globalPourcentage < 100) {
				setTimeout(function(){updateListDownloads();return true;}, 2000);
			}

		}
	});
	return false;
};

function autoReload() {
	updateListDownloads();
	setTimeout(function(){autoReload();return true;}, autoReloadTimer);
	return false;
};

function initFilesLink () {
    var $link = $('#open-files');

	$.getJSON('downloads/folder', null, function( data ) {
		$link.attr("href", "/apps/files/#folders/"+data[0]._id);
	});
	return false;
}

function updateMessage (message) {
	var $crudAlert = $('#crud-alert');
	$crudAlert.html(message);
	$crudAlert.show();
	setTimeout(function(){hideMessage();return true;}, 10000);
}

function hideMessage () {
	var $crudAlert = $('#crud-alert');
	$crudAlert.hide();
}

window.onload = function() {
	$("form").on('submit', function (e) {
		// remove default submit event
		e.preventDefault();
	});

    createDownloadHandler();
    initListDownloads();
	initFilesLink();
	updateListDownloads();
	// auto reload table
	setTimeout(function(){autoReload();}, autoReloadTimer);
	return false;
};
