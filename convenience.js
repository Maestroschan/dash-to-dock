/* -*- mode: js; js-basic-offset: 4; indent-tabs-mode: nil -*- */

/*
 * Part of this file comes from gnome-shell-extensions:
 * http://git.gnome.org/browse/gnome-shell-extensions/
 * 
 */

const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;


/**
 * initTranslations:
 * @domain: (optional): the gettext domain to use
 *
 * Initialize Gettext to load translations from extensionsdir/locale.
 * If @domain is not provided, it will be taken from metadata['gettext-domain']
 */
function initTranslations(domain) {
    let extension = ExtensionUtils.getCurrentExtension();

    domain = domain || extension.metadata['gettext-domain'];

    // check if this extension was built with "make zip-file", and thus
    // has the locale files in a subfolder
    // otherwise assume that extension has been installed in the
    // same prefix as gnome-shell
    let localeDir = extension.dir.get_child('locale');
    if (localeDir.query_exists(null))
        Gettext.bindtextdomain(domain, localeDir.get_path());
    else
        Gettext.bindtextdomain(domain, Config.LOCALEDIR);
}

/**
 * getSettings:
 * @schema: (optional): the GSettings schema id
 *
 * Builds and return a GSettings schema for @schema, using schema files
 * in extensionsdir/schemas. If @schema is not provided, it is taken from
 * metadata['settings-schema'].
 */
function getSettings(schema) {
    let extension = ExtensionUtils.getCurrentExtension();

    schema = schema || extension.metadata['settings-schema'];

    const GioSSS = Gio.SettingsSchemaSource;

    // Check if this extension was built with "make zip-file", and thus
    // has the schema files in a subfolder otherwise assume that extension 
    // has been installed in the same prefix as gnome-shell (and therefore 
    // schemas are available in the standard folders)
    let schemaDir = extension.dir.get_child('schemas');
    let schemaSource;
    if (schemaDir.query_exists(null))
        schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
                                                 GioSSS.get_default(),
                                                 false);
    else
        schemaSource = GioSSS.get_default();

    let schemaObj = schemaSource.lookup(schema, true);
    if (!schemaObj)
        throw new Error('Schema ' + schema + ' could not be found for extension '
                        + extension.metadata.uuid + '. Please check your installation.');

    return new Gio.Settings({ settings_schema: schemaObj });
}

/* Simplify global signals handling */
const globalSignalHandler = new Lang.Class({
    Name: 'dashToDock.globalSignalHandler',

    _init: function(){
        this._signals = new Object();
    },

    push: function(/*unlimited 3-long array arguments*/){
        this._addSignals('generic', arguments);
    },

    disconnect: function() {
        for( let label in this._signals )
            this.disconnectWithLabel(label);
    },

    pushWithLabel: function( label /* plus unlimited 3-long array arguments*/) {

        // skip first element of thearguments array;
        let elements = new Array;
        for(let i = 1 ; i< arguments.length; i++)
            elements.push(arguments[i]);

        this._addSignals(label, elements);
    },

    _addSignals: function(label, elements) {
        if(this._signals[label] == undefined)
            this._signals[label] = new Array();

        for( let i = 0; i < elements.length; i++ ) { 
            let object = elements[i][0];
            let event = elements[i][1];

            let id = object.connect(event, elements[i][2]);
            this._signals[label].push( [ object , id ] );
        }
    },

    disconnectWithLabel: function(label) {

        if(this._signals[label]) {
            for( let i = 0; i < this._signals[label].length; i++ ) {
                this._signals[label][i][0].disconnect(this._signals[label][i][1]);
            }

            delete this._signals[label];
        }
    }
});

/**
 *  File and JSON database management. Stores and parses
 *  the information needed to make a link to a file or a
 *  directory. This is primarily used in "linksTray".
 */
const LinksDB = new Lang.Class({
    Name: 'dashToDock.LinksDB',
    
    _init: function() {
		this.check_or_make_directory();
	},

	check_or_make_directory: function() {
		log("making a directory...");
		let path = ExtensionUtils.getCurrentExtension().path+'/data';
		let dir = Gio.file_new_for_path(path);
		
		if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {
			dir.make_directory(null);
		} else {
			this.open_or_make_db();
		}
	},

	open_or_make_db: function() {
		log("making a database...");
		let path = ExtensionUtils.getCurrentExtension().path+'/data/'+'links_tray_db.json';
		let file = Gio.file_new_for_path(path);

		if (!GLib.file_test(path, GLib.FileTest.EXISTS)) {		
			let fstream = file.create(Gio.FileCreateFlags.NONE, null);
			let default_links = JSON.stringify( { "id": 1, "links": [{"order": 1, "link": "/home/"}]} );
			fstream.write(default_links, null, default_links.length);
//			fstream.close(null);
		} else {
			log("IT EXisto");
			let fstream = file.open_readwrite(null).get_input_stream();
			let size = file.query_info("standard::size",
				Gio.FileQueryInfoFlags.NONE, null).get_size();
				
			let string_data = fstream.read_bytes(size, null).get_data();
			let links_data
			try {
				links_data = JSON.parse(string_data);
			} catch(e) {
				log(_("The file "+path+" is not a meaningful JSON database. Check it!"));
				fstream.close(null);
//log('DNAME '+file.get_parse_name() );//parse_name is full url
				file.set_display_name((file.get_basename()+'.'+(Math.round(Math.random()*10000))), null); 
			}
			
			
//			fstream.close(null);
			log("data is "+string_data);
			log( links_data.links[0].order );
			log( links_data.links[0].link );
		}
	},
	
	save_db: function(data) { 
		let default_links = JSON.stringify(data);
		log ( default_links );
		fstream.write(default_links, null, default_links.length);
		fstream.close(null);		
	}	
});
