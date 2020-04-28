sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"../model/formatter",
	"sap/ui/model/BindingMode",
	"sap/ui/core/Fragment",
	"vinibar/Keeper_UI/model/Customer",
	"sap/uxap/ObjectPageLayout",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (BaseController,
	JSONModel,
	History,
	formatter,
	BindingMode,
	Fragment,
	Customer,
	ObjectPageLayout,
	MessageToast,
	MessageBox) {
	"use strict";

	return BaseController.extend("vinibar.Keeper_UI.controller.Object", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var iOriginalBusyDelay,
				oViewModel = new JSONModel({
					busy: true,
					delay: 0
				});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);

			// Store original busy indicator delay, so it can be restored later on
			iOriginalBusyDelay = this.getView().getBusyIndicatorDelay();
			this.setModel(oViewModel, "objectView");
			this.getOwnerComponent().getModel().metadataLoaded().then(function () {
				// Restore original busy indicator delay for the object view
				oViewModel.setProperty("/delay", iOriginalBusyDelay);
			}
			);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */


		/**
		 * Event handler  for navigating back.
		 * It there is a history entry we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the worklist route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getRouter().navTo("worklist", {}, true);
			}
		},

		onEditCustomer: function (oEvent) {

			var oCustomer = new JSONModel(oEvent.getSource().getBindingContext().getObject());

			this.setModel(oCustomer, "customer");

			var oView = this.getView();

			if (!this._oCustomerDialog) {
				Fragment.load({ id: this.getView().getId(), name: "vinibar.Keeper_UI.view.Customer", controller: this })
					.then(function (oFragment) {
						oView.addDependent(oFragment);
						this._oCustomerDialog = oFragment;
						oFragment.open();
					}.bind(this));
			} else {
				this._oCustomerDialog.open();
			}

		},

		onSaveCustomer: function (oEvent) {

			this.getModel("objectView").setProperty("/busy", true);
			var oCustomer = this.getModel("customer").getData();

			this._oCustomer.updateCustomer(oCustomer)
				.then(function (oData) {
					MessageToast.show("The customer has been successfully updated");
					this.getModel("objectView").setProperty("/busy", false);
					this._oCustomerDialog.close();
				}.bind(this));

		},

		onAddEnvironment: function (oEvent) {

			var oEnvironment = new JSONModel({
				environment_type_ID: "",
				title: ""
			});

			this.setModel(oEnvironment, "environment");

			var oView = this.getView();

			if (!this._oEnvironmentDialog) {
				Fragment.load({ id: this.getView().getId(), name: "vinibar.Keeper_UI.view.Environment", controller: this })
					.then(function (oFragment) {
						oView.addDependent(oFragment);
						this._oEnvironmentDialog = oFragment;
						oFragment.open();
					}.bind(this));
			} else {
				this._oEnvironmentDialog.open();
			}

		},

		onToggetEditEnvironment: function (oEvent) {

			var sEnvironmentID = oEvent.getSource().getBindingContext().getObject().ID;
			var sEnvironmentPath = this.getModel().createKey("Environments", { ID: sEnvironmentID });
			var oPendingEnvironment = this.getModel().getPendingChanges()[sEnvironmentPath];
			sEnvironmentPath = "/" + sEnvironmentPath;

			if (oPendingEnvironment) {
				MessageBox.warning("All your changes will be lost.", {
					actions: [MessageBox.Action.OK, MessageBox.Action.CLOSE],
					onClose: function (sAction) {

						if (sAction === MessageBox.Action.OK) {
							this.getModel().resetChanges([sEnvironmentPath]);
						}
						this._toggleEditEnvironment(sEnvironmentID);
					}.bind(this)
				});
			} else {
				this._toggleEditEnvironment(sEnvironmentID);
			}

		},

		onDeleteEnvironment: function (oEvent) {

			this.getModel("objectView").setProperty("/busy", true);
			this._oCurrentSubSection = oEvent.getSource().getParent();
			this._oCurrentSection = this._oCurrentSubSection.getParent();
			var oEnvironment = this._oCurrentSubSection.getBindingContext().getObject();

			this._oCustomer.deleteEnvironment(oEnvironment)
				.then(function (bDeleted) {
					this._oCurrentSection.removeSubSection(this._oCurrentSubSection.getId());
					delete this._oCurrentSection;
					delete this._oCurrentSubSection;
					this.getModel("objectView").setProperty("/busy", false);
					MessageToast.show("The environment has been successfully deleted");
				}.bind(this));

		},

		onSaveEnvironment: function (oEvent) {

			this.getModel("objectView").setProperty("/busy", true);
			var oSubSection = oEvent.getSource().getParent();
			var oEnvironment = oSubSection.getBindingContext().getObject();

			this._oCustomer.updateEnvironment(oEnvironment)
				.then(function (oData) {
					this._toggleEditEnvironment(oData.ID);
					MessageToast.show("The environment has been successfully updated");
					this.getModel("objectView").setProperty("/busy", false);
				}.bind(this));

		},

		onSaveNewEnvironment: function (oEvent) {

			this.getModel("objectView").setProperty("/busy", true);
			var oEnvironment = this.getModel("environment").getData();
			var oView = this.getView();
			var sCustomerID = oView.getBindingContext().getObject().ID;

			this._oCustomer.createEnvironment({
				environment_type_ID: oEnvironment.environment_type_ID,
				title: oEnvironment.title
			}).then(function (oData) {
				this._oEnvironmentDialog.close();
				setTimeout(function () { // need to wait for the scrollEnablement to be active
					this._scrollToEnvironment(oData.ID);
					this.getModel("objectView").setProperty("/busy", false);
				}.bind(this), 500)

			}.bind(this))
		},

		onAddCredential: function (oEvent) {

			var sEnvironmentID = oEvent.getSource().getBindingContext().getObject().ID;

			var oCredential = new JSONModel({
				environment_ID: sEnvironmentID,
				username: "",
				password: ""
			});

			this.setModel(oCredential, "credential");

			var oView = this.getView();

			if (!this._oCredentialDialog) {
				Fragment.load({ id: this.getView().getId(), name: "vinibar.Keeper_UI.view.Credential", controller: this })
					.then(function (oFragment) {
						oView.addDependent(oFragment);
						this._oCredentialDialog = oFragment;
						oFragment.open();
					}.bind(this));
			} else {
				this._oCredentialDialog.open();
			}

		},

		onDeleteCredential: function (oEvent) {

			this.getModel("objectView").setProperty("/busy", true);
			var oCredential = oEvent.getParameter("listItem").getBindingContext().getObject();

			this._oCustomer.deleteCredential(oCredential).then(function () {
				this.getModel("objectView").setProperty("/busy", false);
				MessageToast.show("The credential has been successfully deleted.")
			}.bind(this));

		},

		onEditCredential: function (oEvent) {

			var oCredential = new JSONModel(oEvent.getSource().getBindingContext().getObject());
			this.setModel(oCredential, "credential");

			var oView = this.getView();
			if (!this._oCredentialDialog) {
				Fragment.load({ id: this.getView().getId(), name: "vinibar.Keeper_UI.view.Credential", controller: this })
					.then(function (oFragment) {
						oView.addDependent(oFragment);
						this._oCredentialDialog = oFragment;
						oFragment.open();
					}.bind(this));
			} else {
				this._oCredentialDialog.open();
			}

		},

		onSaveCredential: function (oEvent) {

			this.getModel("objectView").setProperty("/busy", true);
			var oCredential = this.getModel("credential").getData();

			if (oCredential.hasOwnProperty("ID")) {
				this._oCustomer.updateCredential(oCredential)
					.then(function () {
						this._oCredentialDialog.close();
						this.getModel("objectView").setProperty("/busy", false);
					}.bind(this));
			} else {
				this._oCustomer.createCredential(oCredential)
					.then(function (oData) {
						this._oCredentialDialog.close();
						this.getModel("objectView").setProperty("/busy", false);
					}.bind(this));
			}

		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		_toggleEditEnvironment: function (sEnvironmentID) {

			var aControls = this.getView().getControlsByFieldGroupId(sEnvironmentID);
			var aVisibility = aControls.filter(oControl => oControl instanceof sap.m.Button || oControl.getId().includes("iTitle"));
			var aEditablity = aControls.filter(oControl => aVisibility.indexOf(oControl) < 0 || oControl.getId().includes("iTitle"));

			aVisibility.forEach(oControl => { oControl.setVisible(!oControl.getVisible()) });
			aEditablity.forEach(oControl => { oControl.setEditable(!oControl.getEditable()) });

		},

		_scrollToEnvironment: function (sEnvironmentID) {

			// Navigate to Section and SubSection Title:
			var oObjectPageLayout = this.byId("ObjectPageLayout");
			var oNavSection;
			var oNavSubSection;

			oObjectPageLayout.getSections()
				.forEach(oSection => {
					oNavSection = oSection;
					oSection.getSubSections()
						.forEach(oSubSection => {
							if (oSubSection.getBindingContext().getObject().ID == sEnvironmentID) {
								oNavSubSection = oSubSection
							}
						});
				});
			oObjectPageLayout.scrollToSection(oNavSubSection.getId());

		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function () {

				this._oCustomer = new Customer(sObjectId, this.getModel());

				// if (sObjectId === "new") {
				// 	var oContext = this.getModel().createEntry("Customers", {
				// 		properties: {
				// 			name: "New Customer"
				// 		}
				// 	});
				// 	oContext.getObject().name = "New Customer";
				// 	var sObjectPath = oContext.getPath();
				// } else {
				var sObjectPath = this.getModel().createKey("/Customers", {
					ID: sObjectId
				});
				// }

				this._bindView(sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound
		 * @private
		 */
		_bindView: function (sObjectPath) {
			var oViewModel = this.getModel("objectView"),
				oDataModel = this.getModel();

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oDataModel.metadataLoaded().then(function () {
							// Busy indicator on view should only be set if metadata is loaded,
							// otherwise there may be two busy indications next to each other on the
							// screen. This happens because route matched handler already calls '_bindView'
							// while metadata is loaded.
							oViewModel.setProperty("/busy", true);
						});
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oViewModel = this.getModel("objectView"),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("objectNotFound");
				return;
			}

			var oResourceBundle = this.getResourceBundle(),
				oObject = oView.getBindingContext().getObject(),
				sObjectId = oObject.ID,
				sObjectName = oObject.name;

			oViewModel.setProperty("/busy", false);

			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
		}

	});

});