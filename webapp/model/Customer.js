sap.ui.define([
	"sap/ui/base/Object"
], function (
	Object
) {
	"use strict";

	return Object.extend("vinibar.Keeper_UI.model.Customer", {

		constructor: function (sId, oModel) {
			this._sId = sId;
			this._oModel = oModel;
		},

		createEnvironment: async function (oEnvironment) {

			var bHasType = await this._hasEnvironmentType(oEnvironment.environment_type_ID);

			if (!bHasType) {
				await this._linkToEnvironmentType(oEnvironment.environment_type_ID);
			}

			var oEnvironment = await this._createEnvironment(oEnvironment);
			return this.getEnvironment(oEnvironment.ID);
		},

		getEnvironment: async function (sEnvironmentID) {

			var sEnvironmentPath = this.getModel().createKey("/Environments", { ID: sEnvironmentID });

			return new Promise(function (resolve, reject) {
				this.getModel().read(sEnvironmentPath, {
					success: function (oData) {
						resolve(oData);
					},
					error: function (oError) {
						reject(oError);
					},
					urlParameters: {
						"$expand": "customer2environment_type/environment_type"
					}
				})
			}.bind(this));

		},

		deleteEnvironment: async function (oEnvironment) {

			var sEnvironmentPath = this.getModel().createKey("/Environments", { ID: oEnvironment.ID });

			for (let oCredential in oEnvironment.auths) {
				if (oCredential.hasOwnProperty("ID")) {
					await this.deleteCredential(oCredential);
				}
			}

			return new Promise(function (resolve, reject) {
				this.getModel().remove(sEnvironmentPath, {
					success: resolve(true),
					error: reject(),
					refreshAfterChange: false
				})
			}.bind(this));

		},

		updateEnvironment: function (oEnvironment) {

			var sEnvironmentPath = this.getModel().createKey("/Environments", { ID: oEnvironment.ID });
			return new Promise(function (resolve, reject) {
				this.getModel().update(sEnvironmentPath, oEnvironment, {
					success: resolve(oEnvironment),
					error: reject()
				})
			}.bind(this));

		},

		createCredential: async function (oNewCredential) {

			return new Promise(function (resolve, reject) {
				this.getModel().create("/Auths", oNewCredential, {
					success: (oData) => {
						resolve(oData);
					},
					error: (oError) => {
						reject(oError);
					}
				});
			}.bind(this));

		},

		updateCredential: function (oCredential) {

			var sCredentialPath = this.getModel().createKey("/Auths", { ID: oCredential.ID });

			return new Promise(function (resolve, reject) {
				this.getModel().update(sCredentialPath, oCredential, {
					success: function (oData) {
						resolve(true);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));

		},


		deleteCredential: function (oCredential) {

			var sCredentialPath = this.getModel().createKey("/Auths", { ID: oCredential.ID });

			return new Promise(function (resolve, reject) {
				this.getModel().remove(sCredentialPath, {
					success: function (oData) {
						resolve(true);
					},
					error: function (oError) {
						reject(oError);
					}
				});
			}.bind(this));

		},

		_hasEnvironmentType: function (sEnvironmentTypeID) {

			var oCustomer2EnvironmentType = {
				customer_ID: this._sId,
				environment_type_ID: sEnvironmentTypeID
			};

			var sCustomerTypePath = this.getModel().createKey("/Customers2EnvironmentTypes", oCustomer2EnvironmentType);

			return new Promise(function (resolve) {
				this.getModel().read(sCustomerTypePath, {
					success: resolve(true),
					error: resolve(false)
				});
			}.bind(this));

		},

		_link2EnvironmentType: function (sEnvironmentTypeID) {

			var oCustomer2EnvironmentType = {
				customer_ID: this._sId,
				environment_type_ID: sEnvironmentTypeID
			};

			return new Promise(function (resolve, reject) {
				this.getModel().create("/Customers2EnvironmentTypes", oCustomer2EnvironmentType, {
					success: resolve(),
					error: (oError) => {
						reject(oError)
					}
				})
			}.bind(this));

		},

		_createEnvironment: function (oEnvironment) {

			var oNewEnvironment = {
				customer2environment_type_customer_ID: this._sId,
				customer2environment_type_environment_type_ID: oEnvironment.environment_type_ID,
				title: oEnvironment.title
			};

			return new Promise(function (resolve, reject) {
				this.getModel().create("/Environments", oNewEnvironment, {
					success: (oData) => {
						resolve(oData);
					},
					error: (oError) => {
						reject(oError);
					}
				});
			}.bind(this));

		},

		getModel: function () {
			return this._oModel;
		}

	});
});