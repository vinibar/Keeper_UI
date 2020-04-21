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

			return this._createEnvironment(oEnvironment);

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