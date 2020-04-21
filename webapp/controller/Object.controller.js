sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"../model/formatter",
	"sap/ui/model/BindingMode",
	"sap/ui/core/Fragment",
	"sap/m/MessageBox"
], function (BaseController,
	JSONModel,
	History,
	formatter,
	BindingMode,
	Fragment,
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

		onAddEnvironment: function (oEvent) {

			var oNewEnvironment = new JSONModel({
				environment_type_ID: "",
				title: ""
			});

			this.setModel(oNewEnvironment, "newEnvironment");

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

		onSaveNewEnvironment: function (oEvent) {

			var oNewEnvironment = this.getModel("newEnvironment").getData();
			var oView = this.getView();
			var sCustomerID = oView.getBindingContext().getObject().ID;

			var oCustomer2EnvironmentType = {
				customer_ID: sCustomerID,
				environment_type_ID: oNewEnvironment.environment_type_ID
			};

			var sCustomerTypePath = this.getModel().createKey("/Customers2EnvironmentTypes", oCustomer2EnvironmentType);

			// check if customer is already linked with the environment type
			new Promise(function (resolve, reject) {
				this.getModel().read(sCustomerTypePath, {
					success: (oData) => {
						resolve(oData);
					},
					error: (oError) => {
						reject(oError);
					}
				});
			}.bind(this))
				// if it's not, do it
				.catch(function (oError) {

					return new Promise(function (resolve, reject) {
						this.getModel().create("/Customers2EnvironmentTypes", oCustomer2EnvironmentType, {
							success: (oData) => {
								resolve(oData);
							},

							error: (oError) => {
								reject(this)
							}
						})
					}.bind(this));

				}.bind(this))
				// then create the Environment
				.then(function (oData) {

					var oView = this.getView();
					var sCustomerID = oView.getBindingContext().getObject().ID;
					var sEnvironmentTypeID = this.getModel("newEnvironment").getData().environment_type_ID;
					var sTitle = this.getModel("newEnvironment").getData().title;

					var oNewEnvironment = {
						customer2environment_type_customer_ID: sCustomerID,
						customer2environment_type_environment_type_ID: sEnvironmentTypeID,
						title: sTitle
					};

					return new Promise(function (resolve, reject) {
						this.getModel().create("/Environments", oNewEnvironment, {
							success: (oData) => {
								resolve(oData);
							},
							error: (oError) => {
								reject(oError.message, {
									icon: "sap-icon://error",
									title: "Erro"	
								});
							}
						});
					}.bind(this));

				}.bind(this))
				// Finally, update the view
				.catch(function (oError) {
					debugger;
					MessageBox.show(oError);
				}.bind(this))
				.then(function (oData) {
					this.getModel().updateBindings();
					this._oEnvironmentDialog.close();
				}.bind(this));

		},

		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Binds the view to the object path.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel().metadataLoaded().then(function () {


				if (sObjectId === "new") {
					var oContext = this.getModel().createEntry("Customers", {
						properties: {
							name: "New Customer"
						}
					});
					oContext.getObject().name = "New Customer";
					var sObjectPath = oContext.getPath();
				} else {
					var sObjectPath = this.getModel().createKey("/Customers", {
						ID: sObjectId
					});
				}

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